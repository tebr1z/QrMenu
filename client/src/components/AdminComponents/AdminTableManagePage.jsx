import React, { useState, useEffect } from 'react';
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API || '/api',
});

const AdminTableManagePage = () => {
  const [tables, setTables] = useState([]);
  const [sessions, setSessions] = useState([]); // Backend-based sessions
  const [products, setProducts] = useState([]); // Real products from backend
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modalOrder, setModalOrder] = useState(null);
  const [paidAmount, setPaidAmount] = useState(0);

  // Fetch tables, active sessions, and products from backend
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [tablesRes, sessionsRes, productsRes] = await Promise.all([
          api.get('/table/GetTables'),
          api.get('/tablesession/Active'),
          api.get('/Product/GetProduct'),
        ]);
        setTables(Array.isArray(tablesRes.data) ? tablesRes.data : []);
        setSessions(Array.isArray(sessionsRes.data) ? sessionsRes.data : []);
        setProducts(Array.isArray(productsRes.data) ? productsRes.data : []);
      } catch (err) {
        setError('Məlumatlar yüklənmədi');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // Start table session (backend)
  const handleStart = async (table) => {
    setLoading(true);
    setError('');
    try {
      await api.post('/tablesession/Start', {
        tableId: table.id || table._id,
        tableName: table.name,
        startTime: Date.now(),
        hourlyPrice: table.hourlyPrice,
        selectedMenu: [],
      });
      // Refresh sessions
      const res = await api.get('/tablesession/Active');
      setSessions(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError('Masa başlatılarkən xəta baş verdi');
    } finally {
      setLoading(false);
    }
  };

  // Add menu item to session (local only, can be extended to backend)
  const handleAddMenuToSession = async (sessionId, menuId) => {
    setSessions(sessions => sessions.map(s =>
      s._id === sessionId
        ? { ...s, selectedMenu: [...s.selectedMenu, products.find(item => (item._id === menuId || item.id === Number(menuId)))] }
        : s
    ));
  };

  // Remove menu item from session (local only)
  const handleRemoveMenuFromSession = (sessionId, menuId) => {
    setSessions(sessions => sessions.map(s =>
      s._id === sessionId
        ? { ...s, selectedMenu: s.selectedMenu.filter(item => (item._id || item.id) !== menuId) }
        : s
    ));
  };

  // Finish session: delete from backend, add to finished orders (only API, no local)
  const handleFinish = async (session) => {
    setLoading(true);
    setError('');
    try {
      const endTime = Date.now();
      const durationMs = endTime - session.startTime;
      const durationMinutes = Math.max(1, Math.round(durationMs / (1000 * 60)));
      const totalFreeMinutes = session.selectedMenu.reduce((sum, item) => sum + (item.freeMinutes || 0), 0);
      let chargeableMinutes = durationMinutes - totalFreeMinutes;
      let freeInfo = '';
      if (totalFreeMinutes > 0) {
        if (chargeableMinutes <= 0) {
          chargeableMinutes = 0;
          freeInfo = `Məhsullara görə ${totalFreeMinutes} dəqiqə pulsuz vaxt`;
        } else {
          freeInfo = `Məhsullara görə ${totalFreeMinutes} dəqiqə pulsuz vaxt, əlavə ${chargeableMinutes} dəqiqə üçün hesablandı`;
        }
      }
      let hourTotal = (chargeableMinutes > 0) ? (chargeableMinutes * session.hourlyPrice) / 60 : 0;
      const menuTotal = session.selectedMenu.reduce((sum, item) => sum + item.price, 0);
      const total = hourTotal + menuTotal;
      const order = {
        tableId: session.tableId,
        tableName: session.tableName,
        startTime: session.startTime,
        endTime,
        durationMinutes,
        hourlyPrice: session.hourlyPrice,
        hourTotal,
        selectedMenu: session.selectedMenu,
        menuTotal,
        total,
        freeInfo,
      };
      setModalOrder(order);
      await api.post('/order/AddOrder', order);
      await api.delete(`/tablesession/${session._id}`);
      // Refresh sessions
      const res = await api.get('/tablesession/Active');
      setSessions(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError('Session bitirilərkən xəta baş verdi');
    } finally {
      setLoading(false);
    }
  };

  // Format time
  const formatTime = (ms) => {
    const date = new Date(ms);
    return date.toLocaleTimeString();
  };

  // Defensive: always use array for tables
  const safeTables = Array.isArray(tables) ? tables : [];

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-8 text-gray-800 text-center tracking-tight">Masaların idarəsi</h1>
      {loading && <div className="text-gray-500 mb-4">Yüklənir...</div>}
      {error && <div className="text-red-500 mb-4">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {safeTables.length === 0 && <div className="col-span-2 text-gray-500">Heç bir masa əlavə edilməyib.</div>}
        {safeTables.map(table => {
          const session = sessions.find(s => s.tableId === (table.id || table._id));
          return (
            <div key={table.id || table._id} className={`relative flex flex-col bg-white shadow-lg rounded-2xl p-6 border-l-8 ${session ? 'border-orange-500' : 'border-gray-200'} transition group`}
              style={{ minHeight: 220 }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-orange-100 p-2 rounded-full">
                  <i className="bi bi-table text-orange-500 text-2xl"></i>
                </div>
                <span className="font-bold text-gray-800 text-xl">{table.name}</span>
                <span className={`ml-auto px-3 py-1 rounded-full text-xs font-semibold ${session ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{session ? 'Aktiv' : 'Boş'}</span>
              </div>
              <div className="flex items-center gap-4 mb-2">
                <span className="text-sm text-gray-600">Saatlıq qiymət:</span>
                <span className="text-base font-semibold text-gray-800">{table.hourlyPrice}₼</span>
              </div>
              {!session ? (
                <button onClick={() => handleStart(table)} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition w-fit">Başlat</button>
              ) : (
                <div className="bg-orange-50 rounded-xl p-4 mt-2 flex-1 flex flex-col gap-2 border border-orange-200">
                  <div className="flex items-center gap-2 mb-1">
                    <i className="bi bi-clock-history text-orange-400"></i>
                    <span className="text-xs text-gray-500">Başlama vaxtı:</span>
                    <span className="text-sm font-semibold text-gray-700">{formatTime(session.startTime)}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <i className="bi bi-cash-coin text-green-500"></i>
                    <span className="text-xs text-gray-500">Saatlıq qiymət:</span>
                    <span className="text-sm font-semibold text-gray-700">{table.hourlyPrice}₼</span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <i className="bi bi-plus-circle text-blue-500"></i>
                    <span className="text-xs text-gray-500">Menyu əlavə et:</span>
                    <select
                      value=""
                      onChange={e => {
                        handleAddMenuToSession(session._id, e.target.value);
                        e.target.value = "";
                      }}
                      className="border px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-orange-400"
                    >
                      <option value="" disabled>Seçin</option>
                      {products.map(item => (
                        <option key={item._id || item.id} value={item._id || item.id}>{item.name} ({item.price}₼)</option>
                      ))}
                    </select>
                  </div>
                  {session.selectedMenu.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2 mt-2">
                      {Object.entries(session.selectedMenu.reduce((acc, item) => {
                        acc[item._id || item.id] = acc[item._id || item.id] ? { ...item, count: acc[item._id || item.id].count + 1 } : { ...item, count: 1 };
                        return acc;
                      }, {})).map(([id, item]) => (
                        <div key={id} className="bg-white border border-orange-200 px-3 py-1 rounded flex items-center gap-3 shadow-sm">
                          <span className="text-sm font-medium text-gray-700">{item.name} <span className="text-gray-400">({item.price}₼)</span></span>
                          <span className="inline-block bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">x{item.count}</span>
                          <button
                            title="Bir ədəd sil"
                            onClick={() => handleRemoveMenuFromSession(session._id, item._id || item.id)}
                            className="ml-1 text-red-500 hover:text-red-700 p-1 rounded-full transition"
                          >
                            <i className="bi bi-trash text-base"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex justify-end mt-2">
                    <button onClick={() => handleFinish(session)} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition w-fit">Bitir</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* Modal for receipt */}
      {modalOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md relative border-t-8 border-green-500">
            <button onClick={() => { setModalOrder(null); setPaidAmount(0); }} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            <h2 className="text-2xl font-bold mb-4 text-center text-green-700 tracking-tight">Çek</h2>
            <div className="mb-2 text-center font-semibold text-lg">{modalOrder.tableName}</div>
            <div className="flex flex-col gap-1 mb-2 text-sm text-gray-700">
              <span>Başlama vaxtı: <b>{formatTime(modalOrder.startTime)}</b></span>
              <span>Bitmə vaxtı: <b>{formatTime(modalOrder.endTime)}</b></span>
              <span>Oturma müddəti: <b>{modalOrder.durationMinutes} dəqiqə</b></span>
              <span>Saatlıq qiymət: <b>{modalOrder.hourlyPrice}₼</b></span>
              <span>Vaxt cəmi: <b>{modalOrder.hourTotal.toFixed(2)}₼</b></span>
              {modalOrder.freeInfo && (
                <span className="text-xs text-blue-600 font-semibold">{modalOrder.freeInfo}</span>
              )}
              <span>Məhsullar: {modalOrder.selectedMenu.map(item => `${item.name} (${item.price}₼)`).join(', ') || 'Yoxdur'}</span>
              <span>Məhsul cəmi: <b>{modalOrder.menuTotal}₼</b></span>
            </div>
            <div className="text-2xl font-bold text-center text-green-800 mt-4">Ümumi: {modalOrder.total.toFixed(2)}₼</div>
            <div className="mt-6 flex flex-col gap-2 items-center">
              <label className="font-semibold text-gray-700">Nağd ödəniş (₼):</label>
              <input
                type="number"
                min={0}
                value={paidAmount}
                onChange={e => setPaidAmount(Number(e.target.value))}
                className="border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-orange-400 w-40 text-center text-lg"
                placeholder="Ödənilən məbləğ"
              />
              {paidAmount > 0 && (
                <div className="text-lg font-bold text-blue-700 mt-2">
                  Geri qaytarılacaq məbləğ: {(paidAmount - modalOrder.total).toFixed(2)}₼
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTableManagePage; 