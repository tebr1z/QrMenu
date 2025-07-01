import React, { useState, useEffect } from 'react';
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API || '/api',
});

const AdminAccountsPage = () => {
  const [orders, setOrders] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const url = selectedDate
          ? `/order/GetOrders?date=${selectedDate}`
          : '/order/GetOrders';
        const res = await api.get(url);
        setOrders(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        setOrders([]);
      }
    };
    fetchOrders();
  }, [selectedDate]);

  const formatTime = (ms) => {
    const date = new Date(ms);
    return date.toLocaleString();
  };

  const totalIncome = orders.reduce((sum, order) => sum + order.total, 0);

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-8 text-gray-800 text-center tracking-tight">Bitmiş sifarişlər</h1>
      <div className="mb-8 flex flex-col md:flex-row md:items-center gap-4 justify-between">
        <div className="flex items-center gap-3">
          <i className="bi bi-calendar-event text-orange-500 text-2xl"></i>
          <label className="font-semibold text-gray-700">Tarixə görə filtrlə:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-2 font-bold text-green-800 text-xl shadow-sm">
          <i className="bi bi-cash-coin text-green-600 text-2xl"></i>
          Günlük gəlir:
          <span className="ml-2">{totalIncome.toFixed(2)}₼</span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {orders.length === 0 && <div className="col-span-2 text-gray-500 text-center">Bu tarixdə bitmiş sifariş yoxdur.</div>}
        {orders.map((order, idx) => (
          <div key={order._id || idx} className="bg-white shadow-lg rounded-2xl p-6 border-l-8 border-green-500 flex flex-col gap-2">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-green-100 p-2 rounded-full">
                <i className="bi bi-receipt text-green-600 text-2xl"></i>
              </div>
              <span className="font-bold text-gray-800 text-xl">{order.tableName}</span>
              <span className="ml-auto px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">Bitmiş</span>
            </div>
            <div className="grid grid-cols-1 gap-1 text-sm text-gray-700">
              <div><span className="font-semibold text-gray-600">Başlama vaxtı:</span> <span>{formatTime(order.startTime)}</span></div>
              <div><span className="font-semibold text-gray-600">Bitmə vaxtı:</span> <span>{formatTime(order.endTime)}</span></div>
              <div><span className="font-semibold text-gray-600">Oturma müddəti:</span> <span>{order.durationMinutes} dəqiqə</span></div>
              <div><span className="font-semibold text-gray-600">Saatlıq qiymət:</span> <span>{order.hourlyPrice}₼</span></div>
              <div><span className="font-semibold text-gray-600">Vaxt cəmi:</span> <span>{order.hourTotal.toFixed(2)}₼</span></div>
              <div><span className="font-semibold text-gray-600">Məhsullar:</span> <span>{order.selectedMenu.length > 0 ? order.selectedMenu.map(item => `${item.name} (${item.price}₼)`).join(', ') : 'Yoxdur'}</span></div>
              <div><span className="font-semibold text-gray-600">Məhsul cəmi:</span> <span>{order.menuTotal}₼</span></div>
            </div>
            <div className="text-2xl font-bold text-green-800 mt-4 text-center">Ümumi: {order.total.toFixed(2)}₼</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminAccountsPage; 