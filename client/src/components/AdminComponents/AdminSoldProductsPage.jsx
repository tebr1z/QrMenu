import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API || '/api',
});

const RANGE_OPTIONS = [
  { key: 'today', label: 'Günlük', days: 0 },
  { key: '7', label: 'Son 1 həftə', days: 7 },
  { key: '14', label: 'Son 2 həftə', days: 14 },
  { key: '30', label: 'Son 1 ay', days: 30 },
];

const AdminSoldProductsPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rangeKey, setRangeKey] = useState('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState('revenue_desc');
  const [showAmounts, setShowAmounts] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const PASSWORD_CODE = '2684';

  const handleUnlockAmounts = (event) => {
    event.preventDefault();
    if (passwordInput === PASSWORD_CODE) {
      setShowAmounts(true);
      setShowPasswordModal(false);
      setPasswordInput('');
      setPasswordError('');
    } else {
      setPasswordError('Şifrə yanlışdır');
    }
  };

  const handleToggleAmounts = () => {
    if (showAmounts) {
      setShowAmounts(false);
      return;
    }
    setShowPasswordModal(true);
  };

  const formatMoney = (value) => {
    if (!showAmounts) return '*****';
    return `${value.toFixed(2)}₼`;
  };

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const res = await api.get('/order/GetOrders');
        setOrders(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const dedupeOrders = (inputOrders) => {
    const map = new Map();
    inputOrders.forEach(order => {
      const key = `${order.tableId}_${order.startTime}_${order.endTime}`;
      if (!map.has(key)) {
        map.set(key, order);
      }
    });
    return Array.from(map.values());
  };

  const filteredOrders = useMemo(() => {
    const now = new Date();
    let startTime;
    let endTime;

    if (rangeKey === 'custom' && customStart) {
      const startDate = new Date(customStart);
      startTime = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();

      if (customEnd) {
        const endDate = new Date(customEnd);
        endTime = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() + 1).getTime();
      } else {
        endTime = startTime + 24 * 60 * 60 * 1000;
      }
    } else if (rangeKey === 'today') {
      startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      endTime = startTime + 24 * 60 * 60 * 1000;
    } else {
      const days = RANGE_OPTIONS.find(option => option.key === rangeKey)?.days || 0;
      startTime = now.getTime() - days * 24 * 60 * 60 * 1000;
      endTime = now.getTime();
    }

    return dedupeOrders(orders).filter(order => {
      const orderTime = order.endTime || order.createdAt || order.startTime;
      if (!orderTime) return false;
      const orderMs = new Date(orderTime).getTime();
      return orderMs >= startTime && orderMs < endTime;
    });
  }, [orders, rangeKey, customStart, customEnd]);

  const summary = useMemo(() => {
    const map = new Map();
    let totalRevenue = 0;
    let totalQuantity = 0;

    filteredOrders.forEach(order => {
      const menu = Array.isArray(order.selectedMenu) ? order.selectedMenu : [];
      menu.forEach(item => {
        const quantity = item.quantity || 1;
        const price = item.price || 0;
        const id = item._id || item.id || item.name;
        if (!id) return;

        const current = map.get(id) || {
          name: item.name || 'Bilinməyən məhsul',
          quantity: 0,
          revenue: 0,
        };

        current.quantity += quantity;
        current.revenue += price * quantity;
        map.set(id, current);

        totalQuantity += quantity;
        totalRevenue += price * quantity;
      });
    });

    const rows = Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
    return { rows, totalQuantity, totalRevenue };
  }, [filteredOrders]);

  const visibleRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    let rows = summary.rows;

    if (query) {
      rows = rows.filter(row => row.name.toLowerCase().includes(query));
    }

    const sorted = [...rows];
    switch (sortKey) {
      case 'revenue_asc':
        sorted.sort((a, b) => a.revenue - b.revenue);
        break;
      case 'quantity_desc':
        sorted.sort((a, b) => b.quantity - a.quantity);
        break;
      case 'quantity_asc':
        sorted.sort((a, b) => a.quantity - b.quantity);
        break;
      case 'name_asc':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name_desc':
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'revenue_desc':
      default:
        sorted.sort((a, b) => b.revenue - a.revenue);
        break;
    }

    return sorted;
  }, [summary.rows, searchQuery, sortKey]);

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="bg-white shadow-sm rounded-2xl p-5 border mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Satılan məhsullar</h1>
            <p className="text-sm text-gray-500 mt-1">Filtrlə və məhsul satışlarını asan oxu.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {RANGE_OPTIONS.map(option => (
              <button
                key={option.key}
                onClick={() => setRangeKey(option.key)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                  rangeKey === option.key
                    ? 'bg-orange-600 text-white'
                    : 'bg-white border border-orange-200 text-orange-700 hover:bg-orange-50'
                }`}
              >
                {option.label}
              </button>
            ))}
            <button
              onClick={() => setRangeKey('custom')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                rangeKey === 'custom'
                  ? 'bg-orange-600 text-white'
                  : 'bg-white border border-orange-200 text-orange-700 hover:bg-orange-50'
              }`}
            >
              Tarix seçimi
            </button>
          </div>
        </div>

        {rangeKey === 'custom' && (
          <div className="flex flex-col md:flex-row gap-4 mt-4">
            <div className="flex flex-col flex-1">
              <label className="text-sm font-semibold text-gray-600 mb-1">Başlanğıc tarix</label>
              <input
                type="date"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                className="border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <div className="flex flex-col flex-1">
              <label className="text-sm font-semibold text-gray-600 mb-1">Bitiş tarix (isteğe bağlı)</label>
              <input
                type="date"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                className="border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-4 mt-5">
          <div className="flex-1">
            <label className="text-sm font-semibold text-gray-600 mb-1">Məhsul axtarışı</label>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Məs: Cola, Burger..."
              className="w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div className="flex-1">
            <label className="text-sm font-semibold text-gray-600 mb-1">Sıralama</label>
            <select
              value={sortKey}
              onChange={e => setSortKey(e.target.value)}
              className="w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              <option value="revenue_desc">Qiymət: yüksək → aşağı</option>
              <option value="revenue_asc">Qiymət: aşağı → yüksək</option>
              <option value="quantity_desc">Çox satılanlar</option>
              <option value="quantity_asc">Az satılanlar</option>
              <option value="name_asc">A → Z</option>
              <option value="name_desc">Z → A</option>
            </select>
          </div>
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-2 font-bold text-green-800 text-lg shadow-sm">
            <i className="bi bi-cash-coin text-green-600 text-xl"></i>
            Cəmi:
            <span className="ml-2">{formatMoney(summary.totalRevenue)}</span>
            <button
              type="button"
              onClick={handleToggleAmounts}
              className="ml-2 text-gray-600 hover:text-gray-900 transition"
              title={showAmounts ? 'Gizlə' : 'Məbləği göstər'}
            >
              <i className={`bi ${showAmounts ? 'bi-eye-slash-fill' : 'bi-eye-fill'} text-xl`}></i>
            </button>
          </div>
        </div>
      </div>

      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm bg-gray-900 text-white rounded-2xl shadow-xl p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-gray-800 rounded-full p-2">
                <i className="bi bi-shield-lock text-orange-400 text-xl"></i>
              </div>
              <div>
                <div className="text-lg font-semibold">Şifrə tələb olunur</div>
                <div className="text-xs text-gray-400">Məbləği görmək üçün daxil olun</div>
              </div>
            </div>
            <form onSubmit={handleUnlockAmounts} className="space-y-4">
              <input
                type="password"
                inputMode="numeric"
                autoFocus
                value={passwordInput}
                onChange={e => {
                  setPasswordInput(e.target.value);
                  setPasswordError('');
                }}
                placeholder="****"
                className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              {passwordError && <div className="text-sm text-red-400">{passwordError}</div>}
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordInput('');
                    setPasswordError('');
                  }}
                  className="flex-1 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm font-semibold"
                >
                  Ləğv et
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-sm font-semibold"
                >
                  Aç
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading && <div className="text-gray-500 mb-4">Yüklənir...</div>}
      {!loading && summary.rows.length === 0 && (
        <div className="text-gray-500 text-center">Bu dövr üçün satış yoxdur.</div>
      )}

      {summary.rows.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border rounded-2xl p-4 shadow-sm">
              <div className="text-sm text-gray-500">Unikal məhsul</div>
              <div className="text-2xl font-bold text-gray-800">{summary.rows.length}</div>
            </div>
            <div className="bg-white border rounded-2xl p-4 shadow-sm">
              <div className="text-sm text-gray-500">Cəmi miqdar</div>
              <div className="text-2xl font-bold text-gray-800">{summary.totalQuantity}</div>
            </div>
            <div className="bg-white border rounded-2xl p-4 shadow-sm">
              <div className="text-sm text-gray-500">Cəmi məbləğ</div>
              <div className="text-2xl font-bold text-green-700">{formatMoney(summary.totalRevenue)}</div>
            </div>
          </div>

          <div className="bg-white shadow-lg rounded-2xl overflow-hidden border">
            <div className="px-4 py-3 bg-gray-50 text-sm text-gray-600 flex items-center justify-between">
              <span>Nəticə: {visibleRows.length}</span>
              {searchQuery && <span className="text-gray-500">Axtarış: "{searchQuery}"</span>}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100 text-gray-600">
                  <tr>
                    <th className="text-left font-semibold px-4 py-3">Məhsul</th>
                    <th className="text-center font-semibold px-4 py-3">Miqdar</th>
                    <th className="text-right font-semibold px-4 py-3">Məbləğ</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row, index) => (
                    <tr key={`${row.name}-${index}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 text-gray-800 font-medium">{row.name}</td>
                      <td className="px-4 py-3 text-center text-gray-700">{row.quantity}</td>
                      <td className="px-4 py-3 text-right text-gray-800 font-semibold">{formatMoney(row.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-semibold">
                    <td className="px-4 py-3 text-gray-700">Toplam</td>
                    <td className="px-4 py-3 text-center text-gray-700">{summary.totalQuantity}</td>
                    <td className="px-4 py-3 text-right text-gray-800">{formatMoney(summary.totalRevenue)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSoldProductsPage;
