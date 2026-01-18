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
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState('');

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

  useEffect(() => {
    fetchOrders();
  }, [selectedDate]);

  // Duplicate order-ları tap
  const findDuplicates = () => {
    const duplicates = [];
    const seen = new Map(); // tableId_startTime_endTime -> [orders]
    
    orders.forEach(order => {
      const key = `${order.tableId}_${order.startTime}_${order.endTime}`;
      if (!seen.has(key)) {
        seen.set(key, []);
      }
      seen.get(key).push(order);
    });
    
    // 2 və ya daha çox order varsa, duplicate-dir
    seen.forEach((orderList, key) => {
      if (orderList.length > 1) {
        duplicates.push(...orderList);
      }
    });
    
    return duplicates;
  };

  // Tək order sil
  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('Bu sifarişi silmək istədiyinizə əminsiniz?')) {
      return;
    }
    
    setLoading(true);
    try {
      await api.delete(`/order/${orderId}`);
      setNotification('Sifariş silindi');
      await fetchOrders(); // Yenilə
      setTimeout(() => setNotification(''), 3000);
    } catch (err) {
      setNotification('Sifariş silinərkən xəta baş verdi');
      setTimeout(() => setNotification(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Bütün duplicate-ləri sil (yalnız birini saxla)
  const handleDeleteAllDuplicates = async () => {
    const duplicates = findDuplicates();
    if (duplicates.length === 0) {
      setNotification('Duplicate sifariş tapılmadı');
      setTimeout(() => setNotification(''), 3000);
      return;
    }
    
    if (!window.confirm(`${duplicates.length} duplicate sifariş tapıldı. Hamısını silmək istədiyinizə əminsiniz? (Yalnız bir nüsxə qalacaq)`)) {
      return;
    }
    
    setLoading(true);
    try {
      // Hər duplicate qrupundan birini saxla, qalanlarını sil
      const seen = new Map();
      const toDelete = [];
      
      duplicates.forEach(order => {
        const key = `${order.tableId}_${order.startTime}_${order.endTime}`;
        if (!seen.has(key)) {
          // İlk order-i saxla (ən yeni)
          seen.set(key, order);
        } else {
          // Qalan order-ləri sil
          toDelete.push(order);
        }
      });
      
      // Bütün duplicate-ləri sil
      await Promise.all(toDelete.map(order => api.delete(`/order/${order._id}`)));
      
      setNotification(`${toDelete.length} duplicate sifariş silindi`);
      await fetchOrders(); // Yenilə
      setTimeout(() => setNotification(''), 3000);
    } catch (err) {
      setNotification('Duplicate-lər silinərkən xəta baş verdi');
      setTimeout(() => setNotification(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (ms) => {
    const date = new Date(ms);
    return date.toLocaleString();
  };

  const totalIncome = orders.reduce((sum, order) => sum + order.total, 0);

  const formatMenuItem = (item) => {
    const quantity = item.quantity || 1;
    const lineTotal = item.price * quantity;
    return `${item.name} x${quantity} (${item.price}₼) = ${lineTotal.toFixed(2)}₼`;
  };

  // Text-to-speech notification function with natural voice
  const speakNotification = (text) => {
    try {
      if ('speechSynthesis' in window) {
        // Stop any ongoing speech
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'az-AZ'; // Azerbaijani language
        
        // More natural voice settings
        utterance.rate = 0.95; // Slightly slower for more natural sound
        utterance.pitch = 1.1; // Slightly higher pitch
        utterance.volume = 1.0;
        
        // Try to select a more natural voice
        const voices = window.speechSynthesis.getVoices();
        const azVoice = voices.find(voice => 
          voice.lang.includes('az') || 
          voice.lang.includes('tr') || 
          voice.name.toLowerCase().includes('natural') ||
          voice.name.toLowerCase().includes('premium')
        );
        
        if (azVoice) {
          utterance.voice = azVoice;
        }
        
        window.speechSynthesis.speak(utterance);
      }
    } catch (error) {
      console.error('Səs çalınarkən xəta:', error);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 relative">
      <h1 className="text-3xl font-bold mb-8 text-gray-800 text-center tracking-tight">Bitmiş sifarişlər</h1>
      
      {/* Notification */}
      {notification && (
        <div className={`mb-4 px-4 py-3 rounded-lg flex items-center gap-2 ${
          notification.includes('xəta') 
            ? 'bg-red-100 border border-red-400 text-red-700' 
            : 'bg-green-100 border border-green-400 text-green-700'
        }`}>
          <i className={`bi ${notification.includes('xəta') ? 'bi-x-circle' : 'bi-check-circle'}`}></i>
          {notification}
        </div>
      )}
      
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
        <div className="flex items-center gap-4">
          {/* Duplicate silmə düyməsi */}
          {findDuplicates().length > 0 && (
            <button
              onClick={handleDeleteAllDuplicates}
              disabled={loading}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              title={`${findDuplicates().length} duplicate sifariş tapıldı`}
            >
              <i className="bi bi-trash"></i>
              Duplicate-ləri sil ({findDuplicates().length})
            </button>
          )}
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-2 font-bold text-green-800 text-xl shadow-sm">
            <i className="bi bi-cash-coin text-green-600 text-2xl"></i>
            Günlük gəlir:
            <span className="ml-2">{totalIncome.toFixed(2)}₼</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {orders.length === 0 && <div className="col-span-2 text-gray-500 text-center">Bu tarixdə bitmiş sifariş yoxdur.</div>}
        {orders.map((order, idx) => {
          // Duplicate olub-olmadığını yoxla
          const isDuplicate = findDuplicates().some(dup => dup._id === order._id);
          
          return (
          <div key={order._id || idx} className={`bg-white shadow-lg rounded-2xl p-6 border-l-8 ${isDuplicate ? 'border-red-500' : 'border-green-500'} flex flex-col gap-2 relative`}>
            {/* Duplicate badge */}
            {isDuplicate && (
              <div className="absolute top-2 right-2 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded">
                DUPLICATE
              </div>
            )}
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-full ${isDuplicate ? 'bg-red-100' : 'bg-green-100'}`}>
                <i className={`bi bi-receipt ${isDuplicate ? 'text-red-600' : 'text-green-600'} text-2xl`}></i>
              </div>
              <span className="font-bold text-gray-800 text-xl">{order.tableName}</span>
              <span className={`ml-auto px-3 py-1 rounded-full text-xs font-semibold ${isDuplicate ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                {isDuplicate ? 'Duplicate' : 'Bitmiş'}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-1 text-sm text-gray-700">
              <div><span className="font-semibold text-gray-600">Başlama vaxtı:</span> <span>{formatTime(order.startTime)}</span></div>
              <div><span className="font-semibold text-gray-600">Bitmə vaxtı:</span> <span>{formatTime(order.endTime)}</span></div>
              <div><span className="font-semibold text-gray-600">Oturma müddəti:</span> <span>{order.durationMinutes} dəqiqə</span></div>
              <div><span className="font-semibold text-gray-600">Saatlıq qiymət:</span> <span>{order.hourlyPrice}₼</span></div>
              <div><span className="font-semibold text-gray-600">Vaxt cəmi:</span> <span>{order.hourTotal.toFixed(2)}₼</span></div>
              <div>
                <span className="font-semibold text-gray-600">Məhsullar:</span>
                {order.selectedMenu.length > 0 ? (
                  <ul className="mt-1 list-disc list-inside space-y-1">
                    {order.selectedMenu.map((item, itemIdx) => (
                      <li key={item._id || item.id || itemIdx}>
                        {formatMenuItem(item)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="ml-1">Yoxdur</span>
                )}
              </div>
              <div><span className="font-semibold text-gray-600">Məhsul cəmi:</span> <span>{order.menuTotal}₼</span></div>
            </div>
            <div className="text-2xl font-bold text-green-800 mt-4 text-center">Ümumi: {order.total.toFixed(2)}₼</div>
          </div>
        );
        })}
      </div>
    </div>
  );
};

export default AdminAccountsPage; 