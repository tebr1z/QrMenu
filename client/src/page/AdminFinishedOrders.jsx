import React, { useState, useEffect } from 'react';
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API || '/api',
});

const AdminFinishedOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [date, setDate] = useState('');

  // Backend-dən həmişə data çək, hər 5 saniyədən bir yenilə
  useEffect(() => {
    let interval;
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const url = date ? `/order/GetOrders?date=${date}` : '/order/GetOrders';
        const res = await api.get(url);
        setOrders(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        setError('Sifarişlər yüklənmədi');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
    interval = setInterval(fetchOrders, 5000); // 5 saniyədən bir yenilə
    return () => clearInterval(interval);
  }, [date]);

  // Gündəlik gəlir hesabla
  const dailyTotal = orders.reduce((sum, o) => sum + (o.total || 0), 0);

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-8 text-gray-800 text-center tracking-tight">Bitmiş sifarişlər</h1>
      <div className="flex flex-col md:flex-row gap-4 mb-6 items-center justify-between">
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        <div className="text-lg font-semibold text-green-700">Gündəlik gəlir: <span className="text-2xl">{dailyTotal}₼</span></div>
      </div>
      {loading && <div className="text-gray-500 mb-4">Yüklənir...</div>}
      {error && <div className="text-red-500 mb-4">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {orders.length === 0 && !loading && <div className="col-span-2 text-gray-500">Sifariş yoxdur.</div>}
        {orders.map(order => (
          <div key={order._id} className="bg-white shadow-md rounded-lg p-5 border-l-4 border-orange-500 flex flex-col gap-2">
            <div className="flex items-center gap-2 mb-2">
              <i className="bi bi-table text-orange-500 text-xl"></i>
              <span className="font-bold text-gray-800 text-lg">{order.tableName}</span>
              <span className="ml-auto text-xs text-gray-500">{new Date(order.createdAt).toLocaleString()}</span>
            </div>
            <div className="text-sm text-gray-600">Başlama: <b>{new Date(order.startTime).toLocaleTimeString()}</b> | Bitmə: <b>{new Date(order.endTime).toLocaleTimeString()}</b></div>
            <div className="text-sm text-gray-600">Davametmə: <b>{order.durationMinutes} dəq</b></div>
            <div className="text-sm text-gray-600">Saatlıq qiymət: <b>{order.hourlyPrice}₼</b></div>
            <div className="text-sm text-gray-600">Saatlıq haqq: <b>{order.hourTotal}₼</b></div>
            <div className="text-sm text-gray-600">Menyu: <b>{order.selectedMenu.map(m => m.name).join(', ') || 'Yoxdur'}</b></div>
            <div className="text-sm text-gray-600">Menyu cəmi: <b>{order.menuTotal}₼</b></div>
            {order.freeInfo && <div className="text-xs text-blue-500">{order.freeInfo}</div>}
            <div className="text-lg font-bold text-green-700 mt-2">Ümumi: {order.total}₼</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminFinishedOrders; 