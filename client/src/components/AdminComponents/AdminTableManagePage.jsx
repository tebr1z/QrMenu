import React, { useState, useEffect, useRef, useContext } from 'react';
import axios from 'axios';
import { ContextUser } from '../../context/CheckUserContext';

const api = axios.create({
  baseURL: import.meta.env.VITE_API || '/api',
});

const AdminTableManagePage = () => {
  const { apiClient } = useContext(ContextUser);
  const [tables, setTables] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState('');
  const [notificationType, setNotificationType] = useState('info'); // 'info', 'warning', 'error'
  const [modalOrder, setModalOrder] = useState(null);
  const [paidAmount, setPaidAmount] = useState(0);
  const [productDiscounts, setProductDiscounts] = useState({}); // {productId: discountPercentage}
  const [pricingMethod, setPricingMethod] = useState('rounded'); // '30min', 'minute', 'rounded'
  const timerRefs = useRef({});
  const audioRef = useRef(null);
  const notifiedSessions = useRef(new Set()); // Track which sessions have been notified

  // Local storage key for temporary menu data
  const LOCAL_STORAGE_KEY = 'table_manage_temp_data';

  // Audio notification function
  const playNotificationSound = (type = 'hour') => {
    try {
      // Create audio context for better sound control
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      if (type === 'hour') {
        // Loud alarm sound for 1 hour completion
        const oscillator1 = audioContext.createOscillator();
        const gainNode1 = audioContext.createGain();
        
        oscillator1.connect(gainNode1);
        gainNode1.connect(audioContext.destination);
        
        oscillator1.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator1.type = 'sawtooth'; // More aggressive sound
        gainNode1.gain.setValueAtTime(0.9, audioContext.currentTime);
        
        oscillator1.start(audioContext.currentTime);
        oscillator1.stop(audioContext.currentTime + 0.8);
        
        // Second tone
        setTimeout(() => {
          const oscillator2 = audioContext.createOscillator();
          const gainNode2 = audioContext.createGain();
          
          oscillator2.connect(gainNode2);
          gainNode2.connect(audioContext.destination);
          
          oscillator2.frequency.setValueAtTime(600, audioContext.currentTime);
          oscillator2.type = 'sawtooth';
          gainNode2.gain.setValueAtTime(0.9, audioContext.currentTime);
          
          oscillator2.start(audioContext.currentTime);
          oscillator2.stop(audioContext.currentTime + 0.8);
        }, 200);
        
        // Third tone for emphasis
        setTimeout(() => {
          const oscillator3 = audioContext.createOscillator();
          const gainNode3 = audioContext.createGain();
          
          oscillator3.connect(gainNode3);
          gainNode3.connect(audioContext.destination);
          
          oscillator3.frequency.setValueAtTime(1000, audioContext.currentTime);
          oscillator3.type = 'sawtooth';
          gainNode3.gain.setValueAtTime(0.9, audioContext.currentTime);
          
          oscillator3.start(audioContext.currentTime);
          oscillator3.stop(audioContext.currentTime + 0.6);
        }, 400);
        
      } else if (type === 'freeTime') {
        // Different sound for free time expiration
        const oscillator1 = audioContext.createOscillator();
        const gainNode1 = audioContext.createGain();
        
        oscillator1.connect(gainNode1);
        gainNode1.connect(audioContext.destination);
        
        oscillator1.frequency.setValueAtTime(1000, audioContext.currentTime);
        oscillator1.type = 'square'; // Different waveform
        gainNode1.gain.setValueAtTime(0.9, audioContext.currentTime);
        
        oscillator1.start(audioContext.currentTime);
        oscillator1.stop(audioContext.currentTime + 1);
        
        // Second tone
        setTimeout(() => {
          const oscillator2 = audioContext.createOscillator();
          const gainNode2 = audioContext.createGain();
          
          oscillator2.connect(gainNode2);
          gainNode2.connect(audioContext.destination);
          
          oscillator2.frequency.setValueAtTime(800, audioContext.currentTime);
          oscillator2.type = 'square';
          gainNode2.gain.setValueAtTime(0.9, audioContext.currentTime);
          
          oscillator2.start(audioContext.currentTime);
          oscillator2.stop(audioContext.currentTime + 1);
        }, 300);
      } else if (type === 'order') {
        // Order notification sound
        const oscillator1 = audioContext.createOscillator();
        const gainNode1 = audioContext.createGain();
        
        oscillator1.connect(gainNode1);
        gainNode1.connect(audioContext.destination);
        
        oscillator1.frequency.setValueAtTime(1200, audioContext.currentTime);
        oscillator1.type = 'sine';
        gainNode1.gain.setValueAtTime(0.8, audioContext.currentTime);
        
        oscillator1.start(audioContext.currentTime);
        oscillator1.stop(audioContext.currentTime + 0.4);
        
        // Second tone
        setTimeout(() => {
          const oscillator2 = audioContext.createOscillator();
          const gainNode2 = audioContext.createGain();
          
          oscillator2.connect(gainNode2);
          gainNode2.connect(audioContext.destination);
          
          oscillator2.frequency.setValueAtTime(800, audioContext.currentTime);
          oscillator2.type = 'sine';
          gainNode2.gain.setValueAtTime(0.8, audioContext.currentTime);
          
          oscillator2.start(audioContext.currentTime);
          oscillator2.stop(audioContext.currentTime + 0.4);
        }, 200);
      }
      
    } catch (error) {
      console.error('Səs çalınarkən xəta:', error);
      // Fallback to simple beep
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
      audio.volume = 0.9;
      audio.play().catch(err => console.error('Fallback audio error:', err));
    }
  };

  // Order notification function
  const showOrderNotification = (orderData) => {
    // setOrderNotification(orderData); // This state is now managed by ContextAdmin
    playNotificationSound('order');
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
      // setOrderNotification(null); // This state is now managed by ContextAdmin
      // removeOrderNotification(orderData); // Use removeOrderNotification from ContextAdmin
    }, 10000);
  };

  // Check for notification conditions
  const checkNotificationConditions = (session) => {
    if (!session.startTime) return;
    
    const now = Date.now();
    const elapsedMinutes = Math.floor((now - session.startTime) / (1000 * 60));
    const sessionKey = `${session._id}_${elapsedMinutes}`;
    
    // Check if we already notified for this minute
    if (notifiedSessions.current.has(sessionKey)) return;
    
    // Calculate total free minutes from menu items
    const totalFreeMinutes = session.selectedMenu.reduce((sum, item) => sum + (item.freeMinutes || 0), 0);
    
    // Notification for 1 hour completion
    if (elapsedMinutes === 60) {
      playNotificationSound('hour');
      setNotification(`${session.tableName} masasında 1 saat tamam oldu!`);
      setNotificationType('error');
      notifiedSessions.current.add(sessionKey);
      
      // Clear notification after 5 seconds
      setTimeout(() => {
        setNotification('');
        setNotificationType('info');
      }, 5000);
    }
    
    // Notification for free time expiration
    if (totalFreeMinutes > 0 && elapsedMinutes === totalFreeMinutes) {
      playNotificationSound('freeTime');
      setNotification(`${session.tableName} masasında pulsuz vaxt bitdi!`);
      setNotificationType('warning');
      notifiedSessions.current.add(sessionKey);
      
      // Clear notification after 5 seconds
      setTimeout(() => {
        setNotification('');
        setNotificationType('info');
      }, 5000);
    }
  };

  // Load data from local storage on component mount
  useEffect(() => {
    const loadFromLocalStorage = () => {
      try {
        const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedData) {
          const parsedData = JSON.parse(savedData);
          // If we have saved data and no active sessions, restore it
          if (parsedData.sessions && parsedData.sessions.length > 0) {
            setSessions(parsedData.sessions);
          }
          // Restore pricing method
          if (parsedData.pricingMethod) {
            setPricingMethod(parsedData.pricingMethod);
          }
        }
      } catch (err) {
        console.error('Local storage data yüklənərkən xəta:', err);
        // Clear corrupted data
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
    };

    loadFromLocalStorage();

    // Cleanup function to clear local storage when component unmounts
    return () => {
      // Only clear if there are no active sessions
      if (sessions.length === 0) {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
    };
  }, []);

  // Save data to local storage whenever sessions or pricing method change
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ sessions, pricingMethod }));
    } catch (err) {
      console.error('Local storage-a yazılarkən xəta:', err);
    }
  }, [sessions, pricingMethod]);

  // Fetch tables, active sessions, products, and categories from backend
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [tablesRes, sessionsRes, productsRes, categoriesRes] = await Promise.all([
          api.get('/table/GetTables'),
          api.get('/tablesession/Active'),
          api.get('/Product/GetProduct'),
          api.get('/Category/GetCategory'),
        ]);
        
        console.log('Categories response:', categoriesRes.data);
        setTables(Array.isArray(tablesRes.data) ? tablesRes.data : []);
        
        // Merge backend sessions with local storage data
        const backendSessions = Array.isArray(sessionsRes.data) ? sessionsRes.data : [];
        const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
        let localSessions = [];
        
        if (localData) {
          try {
            const parsedData = JSON.parse(localData);
            localSessions = parsedData.sessions || [];
          } catch (err) {
            console.error('Local data parse xətası:', err);
          }
        }

        // Merge sessions: backend sessions take priority, but keep local menu additions
        const mergedSessions = backendSessions.map(backendSession => {
          const localSession = localSessions.find(ls => ls.tableId === backendSession.tableId);
          return {
            ...backendSession,
            selectedMenu: localSession ? localSession.selectedMenu : backendSession.selectedMenu || []
          };
        });

        setSessions(mergedSessions);
        setProducts(Array.isArray(productsRes.data) ? productsRes.data : []);
        setCategories(Array.isArray(categoriesRes.data) ? categoriesRes.data : []);
      } catch (err) {
        console.error('Data fetch error:', err);
        setNotification('Məlumatlar yüklənmədi: ' + (err.message || 'Naməlum xəta'));
        setNotificationType('error');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // Timer effect for active sessions
  useEffect(() => {
    const updateTimers = async () => {
      const now = Date.now();
      const updatedSessions = sessions.map(session => {
        if (session.startTime) {
          const elapsedSeconds = Math.floor((now - session.startTime) / 1000);
          return { ...session, timer: elapsedSeconds };
        }
        return session;
      });

      setSessions(updatedSessions);

      // Check notification conditions for each session
      updatedSessions.forEach(session => {
        if (session.startTime) {
          checkNotificationConditions(session);
        }
      });

      // Update timer in backend for each active session (only every 30 seconds to reduce API calls)
      for (const session of updatedSessions) {
        if (session._id && session.startTime) {
          const elapsedSeconds = Math.floor((now - session.startTime) / 1000);
          // Only update backend every 30 seconds to reduce API calls
          if (elapsedSeconds % 30 === 0) {
            try {
              await api.put(`/tablesession/${session._id}/timer`, {
                timer: elapsedSeconds
              });
            } catch (err) {
              console.error('Timer yenilənərkən xəta:', err);
            }
          }
        }
      }
    };

    const interval = setInterval(updateTimers, 1000);
    return () => clearInterval(interval);
  }, [sessions]);

  // Start table session (backend)
  const handleStart = async (table) => {
    setLoading(true);
    // setError(''); // Removed as per edit hint
    try {
      const newSession = {
        tableId: table.id || table._id,
        tableName: table.name,
        startTime: Date.now(),
        hourlyPrice: table.hourlyPrice,
        selectedMenu: [],
        timer: 0,
        isActive: true
      };

      const response = await api.post('/tablesession/Start', newSession);
      const savedSession = response.data.session;
      
      setSessions(prev => [...prev, savedSession]);
      
      // Clear any local storage data for this table
      const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (localData) {
        try {
          const parsedData = JSON.parse(localData);
          const filteredSessions = (parsedData.sessions || []).filter(s => s.tableId !== table.id && s.tableId !== table._id);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ sessions: filteredSessions }));
        } catch (err) {
          console.error('Local storage təmizlənərkən xəta:', err);
        }
      }
    } catch (err) {
      // setError('Masa başlatılarkən xəta baş verdi'); // Removed as per edit hint
    } finally {
      setLoading(false);
    }
  };

  // Add menu item to session (both local and backend)
  const handleAddMenuToSession = async (sessionId, menuId) => {
    const selectedProduct = products.find(item => (item._id === menuId || item.id === Number(menuId)));
    if (!selectedProduct) return;

    const updatedSessions = sessions.map(s =>
      s._id === sessionId
        ? { ...s, selectedMenu: [...s.selectedMenu, selectedProduct] }
        : s
    );
    setSessions(updatedSessions);

    // Show local storage notification
    setNotification('Menyu əlavə edildi və local storage-a yazıldı');
    setNotificationType('info');

    // Update in backend
    try {
      const session = updatedSessions.find(s => s._id === sessionId);
      if (session) {
        await api.put(`/tablesession/${sessionId}/menu`, {
          selectedMenu: session.selectedMenu
        });
        setNotification('Menyu backend-ə də yazıldı');
        setNotificationType('info');
      }
    } catch (err) {
      console.error('Menyu backend-ə yazılarkən xəta:', err);
      setNotification('Menyu local storage-a yazıldı, amma backend-ə yazılmadı');
      setNotificationType('warning');
    }

    // Clear notification after 3 seconds
    setTimeout(() => {
      setNotification('');
      setNotificationType('info');
    }, 3000);
  };

  // Remove menu item from session (both local and backend)
  const handleRemoveMenuFromSession = async (sessionId, menuId) => {
    const updatedSessions = sessions.map(s =>
      s._id === sessionId
        ? { ...s, selectedMenu: s.selectedMenu.filter(item => (item._id || item.id) !== menuId) }
        : s
    );
    setSessions(updatedSessions);

    // Show local storage notification
    setNotification('Menyu silindi və local storage-a yazıldı');
    setNotificationType('info');

    // Update in backend
    try {
      const session = updatedSessions.find(s => s._id === sessionId);
      if (session) {
        await api.put(`/tablesession/${sessionId}/menu`, {
          selectedMenu: session.selectedMenu
        });
        setNotification('Menyu backend-dən də silindi');
        setNotificationType('info');
      }
    } catch (err) {
      console.error('Menyu backend-dən silinərkən xəta:', err);
      setNotification('Menyu local storage-dan silindi, amma backend-dən silinmədi');
      setNotificationType('warning');
    }

    // Clear notification after 3 seconds
    setTimeout(() => {
      setNotification('');
      setNotificationType('info');
    }, 3000);
  };

  // Finish session: delete from backend, add to finished orders
  const handleFinish = async (session) => {
    setLoading(true);
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

      // Hesablama qaydası seçilən metoda görə
      let hourTotal = 0;
      let pricingRule = '';
      
      if (chargeableMinutes > 0) {
        switch (pricingMethod) {
          case '30min':
            // 30 dəqiqə qaydası (köhnə sistem)
            if (chargeableMinutes <= 30) {
              hourTotal = session.hourlyPrice / 2;
              pricingRule = '30 dəqiqə qaydası (yarım saat)';
            } else {
              const fullHours = Math.ceil(chargeableMinutes / 60);
              hourTotal = session.hourlyPrice * fullHours;
              pricingRule = `${fullHours} saat (yuvarlaqlaşdırılmış)`;
            }
            break;
            
          case 'minute':
            // Dəqiqə əsaslı hesablama
            const pricePerMinute = session.hourlyPrice / 60;
            hourTotal = chargeableMinutes * pricePerMinute;
            pricingRule = `Dəqiqə əsaslı (${pricePerMinute.toFixed(3)}₼/dəqiqə)`;
            break;
            
          case 'rounded':
            // 10 qəpiklik yuvarlaqlaşdırma qaydası (pula görə)
            const pricePerMinuteRounded = session.hourlyPrice / 60;
            const exactTotal = chargeableMinutes * pricePerMinuteRounded;
            
            // 10 qəpiklik yuvarlaqlaşdırma
            // 21-29 qəpik → 30 qəpik
            // 31-39 qəpik → 40 qəpik
            // 41-49 qəpik → 50 qəpik
            // və s.
            const qepik = Math.round(exactTotal * 100) % 100; // Qəpik hissəsi
            let roundedQepik = qepik;
            
            if (qepik > 0) {
              // 10 qəpiklik intervallarla yuvarlaqlaşdırma
              roundedQepik = Math.ceil(qepik / 10) * 10;
            }
            
            // Yuvarlaqlaşdırılmış məbləğ
            const manat = Math.floor(exactTotal);
            hourTotal = manat + (roundedQepik / 100);
            
            pricingRule = `10 qəpiklik yuvarlaqlaşdırma (${exactTotal.toFixed(2)}₼→${hourTotal.toFixed(2)}₼)`;
            break;
            
          default:
            // Default: dəqiqə əsaslı
            const pricePerMinuteDefault = session.hourlyPrice / 60;
            hourTotal = chargeableMinutes * pricePerMinuteDefault;
            pricingRule = `Dəqiqə əsaslı (${pricePerMinuteDefault.toFixed(3)}₼/dəqiqə)`;
        }
      }

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
        chargeableMinutes,
        pricingRule
      };
      
      setModalOrder(order);
      setPaidAmount(0);
      setProductDiscounts({});
    } catch (err) {
      console.error('Session bitirilərkən xəta:', err);
      setNotification('Session bitirilərkən xəta baş verdi');
      setNotificationType('error');
    } finally {
      setLoading(false);
    }
  };

  // Calculate product discount amount
  const calculateProductDiscount = (price, discountPercentage) => {
    return (price * discountPercentage) / 100;
  };

  // Calculate product total after discount
  const calculateProductTotal = (price, discountPercentage) => {
    const discountAmount = calculateProductDiscount(price, discountPercentage);
    return price - discountAmount;
  };

  // Calculate total menu amount with individual product discounts
  const calculateMenuTotalWithDiscounts = (selectedMenu, discounts) => {
    return selectedMenu.reduce((sum, item) => {
      const productId = item._id || item.id;
      const discount = discounts[productId] || 0;
      const discountedPrice = calculateProductTotal(item.price, discount);
      return sum + discountedPrice;
    }, 0);
  };

  // Calculate final total including product discounts
  const calculateFinalTotalWithProductDiscounts = (hourTotal, selectedMenu, discounts) => {
    const menuTotal = calculateMenuTotalWithDiscounts(selectedMenu, discounts);
    return hourTotal + menuTotal;
  };

  // Filter products by selected category
  const getFilteredProducts = () => {
    if (!selectedCategory) return [];
    return products.filter(product => {
      // Check if product.category is an object (populated) or string (ObjectId)
      if (typeof product.category === 'object' && product.category !== null) {
        return product.category._id === selectedCategory;
      } else {
        return product.category === selectedCategory;
      }
    });
  };

  // Complete payment and finish session
  const handleCompletePayment = async () => {
    if (!modalOrder) return;
    
    setLoading(true);
    try {
      // Add order to backend
      await api.post('/order/AddOrder', modalOrder);
      
      // Delete session from backend
      const session = sessions.find(s => s.tableId === modalOrder.tableId);
      if (session) {
        await api.delete(`/tablesession/${session._id}`);
      }
      
      // Remove from local sessions immediately
      setSessions(prev => prev.filter(s => s._id !== session?._id));
      
      // Clear local storage for this table
      const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (localData) {
        try {
          const parsedData = JSON.parse(localData);
          const filteredSessions = (parsedData.sessions || []).filter(s => s.tableId !== modalOrder.tableId);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ sessions: filteredSessions }));
        } catch (err) {
          console.error('Local storage təmizlənərkən xəta:', err);
        }
      }
      
      // Close modal immediately
      setModalOrder(null);
      setPaidAmount(0);
      setProductDiscounts({});
      
      setNotification('Ödəniş uğurla tamamlandı');
      setNotificationType('info');
      
      // Clear notification after 2 seconds
      setTimeout(() => {
        setNotification('');
        setNotificationType('info');
      }, 2000);
      
    } catch (err) {
      console.error('Ödəniş tamamlanarkən xəta:', err);
      setNotification('Ödəniş tamamlanarkən xəta baş verdi');
      setNotificationType('error');
    } finally {
      setLoading(false);
    }
  };

  // Format time
  const formatTime = (ms) => {
    const date = new Date(ms);
    return date.toLocaleTimeString();
  };

  // Format timer display
  const formatTimer = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get timer display style based on elapsed time
  const getTimerStyle = (session) => {
    if (!session.startTime) return {};
    
    const elapsedMinutes = Math.floor((Date.now() - session.startTime) / (1000 * 60));
    const totalFreeMinutes = session.selectedMenu.reduce((sum, item) => sum + (item.freeMinutes || 0), 0);
    
    // Red background for 1 hour completion or free time expiration
    if (elapsedMinutes >= 60 || (totalFreeMinutes > 0 && elapsedMinutes >= totalFreeMinutes)) {
      return {
        backgroundColor: '#fee2e2',
        color: '#dc2626',
        fontWeight: 'bold',
        animation: 'pulse 1s infinite',
        border: '2px solid #dc2626'
      };
    }
    
    // Orange background for approaching 1 hour (45+ minutes)
    if (elapsedMinutes >= 45) {
      return {
        backgroundColor: '#fed7aa',
        color: '#ea580c',
        fontWeight: 'bold',
        border: '2px solid #ea580c'
      };
    }
    
    // Yellow background for approaching free time expiration
    if (totalFreeMinutes > 0 && elapsedMinutes >= totalFreeMinutes - 5) {
      return {
        backgroundColor: '#fef3c7',
        color: '#d97706',
        fontWeight: 'bold',
        border: '2px solid #d97706'
      };
    }
    
    // Default active timer style - distinct blue color
    return {
      backgroundColor: '#dbeafe',
      color: '#1d4ed8',
      fontWeight: 'bold',
      border: '2px solid #3b82f6',
      boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)',
      animation: 'glow 2s ease-in-out infinite'
    };
  };

  // Defensive: always use array for tables
  const safeTables = Array.isArray(tables) ? tables : [];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Order Notifications */}
      {/* Removed as per edit hint */}

      {/* Session Status Indicator */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
            <h2 className="text-2xl font-bold text-gray-800">Aktiv Session</h2>
          </div>
          <div className="text-sm text-gray-600">
            Son yeniləmə: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
          .pulse {
            animation: pulse 1s infinite;
          }
          @keyframes glow {
            0%, 100% { box-shadow: 0 0 5px rgba(59, 130, 246, 0.5); }
            50% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.8); }
          }
          .glow {
            animation: glow 2s ease-in-out infinite;
          }
        `}
      </style>
      <h1 className="text-3xl font-bold mb-8 text-gray-800 text-center tracking-tight">Masaların idarəsi</h1>
      
      {/* Debug info */}
      <div className="bg-yellow-50 p-3 rounded-lg mb-4 text-sm">
        <div>Kateqoriyalar sayı: {categories.length}</div>
        <div>Məhsullar sayı: {products.length}</div>
        <div>Seçilən kateqoriya: {selectedCategory || 'Yox'}</div>
        <div>Filtrlənmiş məhsullar sayı: {getFilteredProducts().length}</div>
        {selectedCategory && (
          <div className="mt-2">
            <div className="font-semibold">Məhsul məlumatları:</div>
            {products.slice(0, 3).map((product, index) => (
              <div key={index} className="text-xs">
                {product.name} - Category: {typeof product.category === 'object' ? product.category?._id : product.category}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Hesablama Qaydası Seçimi */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Hesablama Qaydası</h3>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              name="pricingMethod"
              value="30min"
              checked={pricingMethod === '30min'}
              onChange={(e) => setPricingMethod(e.target.value)}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm font-medium text-gray-700">
              30 Dəqiqə Qaydası
              <span className="block text-xs text-gray-500">1-30 dəqiqə: yarım saat, 31+ dəqiqə: tam saat</span>
            </span>
          </label>
          
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              name="pricingMethod"
              value="minute"
              checked={pricingMethod === 'minute'}
              onChange={(e) => setPricingMethod(e.target.value)}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm font-medium text-gray-700">
              Dəqiqə Əsaslı
              <span className="block text-xs text-gray-500">Hər dəqiqə üçün dəqiq hesablama</span>
            </span>
          </label>
          
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              name="pricingMethod"
              value="rounded"
              checked={pricingMethod === 'rounded'}
              onChange={(e) => setPricingMethod(e.target.value)}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm font-medium text-gray-700">
              10 Qəpiklik Yuvarlaqlaşdırma
              <span className="block text-xs text-gray-500">21-29→30, 31-39→40, 41-49→50, 51-59→60, 61-69→70</span>
            </span>
          </label>
        </div>
      </div>
      
      
      {loading && <div className="text-gray-500 mb-4">Yüklənir...</div>}
      {/* error && <div className="text-red-500 mb-4">{error}</div> */} {/* Removed as per edit hint */}
      {notification && (
        <div className={`px-4 py-3 rounded mb-4 flex items-center gap-2 ${
          notificationType === 'error' 
            ? 'bg-red-100 border border-red-400 text-red-700' 
            : notificationType === 'warning' 
            ? 'bg-yellow-100 border border-yellow-400 text-yellow-700' 
            : 'bg-green-100 border border-green-400 text-green-700'
        }`}>
          <i className={`bi ${
            notificationType === 'error' 
              ? 'bi-x-circle' 
              : notificationType === 'warning' 
              ? 'bi-exclamation-triangle' 
              : 'bi-info-circle'
          }`}></i>
          {notification}
        </div>
      )}
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
                  
                  {/* Timer Display */}
                  <div className="flex items-center gap-2 mb-1">
                    <i className="bi bi-stopwatch text-blue-600"></i>
                    <span className="text-xs text-gray-500 font-medium">⏱️ Aktiv vaxt:</span>
                    <span 
                      className="text-sm font-semibold px-3 py-2 rounded-lg relative"
                      style={getTimerStyle(session)}
                    >
                      {formatTimer(session.timer || 0)}
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-1">
                    <i className="bi bi-cash-coin text-green-500"></i>
                    <span className="text-xs text-gray-500">Saatlıq qiymət:</span>
                    <span className="text-sm font-semibold text-gray-700">{table.hourlyPrice}₼</span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <i className="bi bi-plus-circle text-blue-500"></i>
                    <span className="text-xs text-gray-500">Menyu əlavə et:</span>
                    <div className="flex gap-2">
                      <select
                        value={selectedCategory}
                        onChange={e => {
                          setSelectedCategory(e.target.value);
                        }}
                        className="border px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-orange-400"
                      >
                        <option value="" disabled>Kateqoriya seçin</option>
                        {categories.length > 0 ? (
                          categories.map(category => (
                            <option key={category._id || category.id} value={category._id || category.id}>
                              {category.name}
                            </option>
                          ))
                        ) : (
                          <option value="" disabled>Kateqoriya yoxdur</option>
                        )}
                      </select>
                      
                      {selectedCategory && (
                        <select
                          value=""
                          onChange={e => {
                            handleAddMenuToSession(session._id, e.target.value);
                            e.target.value = "";
                          }}
                          className="border px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-orange-400"
                        >
                          <option value="" disabled>Məhsul seçin</option>
                          {getFilteredProducts().map(item => (
                            <option key={item._id || item.id} value={item._id || item.id}>
                              {item.name} ({item.price}₼)
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
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
      {/* Payment Modal */}
      {modalOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative border-t-8 border-green-500 flex flex-col max-h-[90vh]">
            <button 
              onClick={() => { setModalOrder(null); setPaidAmount(0); setProductDiscounts({}); }} 
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl font-bold z-10"
            >
              ×
            </button>
            
            {/* Header - Fixed */}
            <div className="p-8 pb-4 border-b border-gray-100">
              <h2 className="text-2xl font-bold mb-6 text-center text-green-700 tracking-tight">Ödəniş Çeki</h2>
              
              <div className="mb-4 text-center">
                <div className="text-xl font-bold text-gray-800 mb-2">{modalOrder.tableName}</div>
                <div className="text-sm text-gray-600">Masa Ödənişi</div>
              </div>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-8 pt-4">
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Başlama vaxtı:</span>
                  <span className="font-semibold">{formatTime(modalOrder.startTime)}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Bitmə vaxtı:</span>
                  <span className="font-semibold">{formatTime(modalOrder.endTime)}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Oturma müddəti:</span>
                  <span className="font-semibold">{modalOrder.durationMinutes} dəqiqə</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Saatlıq qiymət:</span>
                  <span className="font-semibold">{modalOrder.hourlyPrice}₼</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Hesablanan vaxt:</span>
                  <span className="font-semibold">{modalOrder.chargeableMinutes} dəqiqə</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Qiymət qaydası:</span>
                  <span className="font-semibold text-blue-600">{modalOrder.pricingRule}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Vaxt cəmi:</span>
                  <span className="font-semibold text-blue-600">{modalOrder.hourTotal.toFixed(2)}₼</span>
                </div>
                
                <div className="bg-blue-50 p-3 rounded-lg mb-3">
                  <span className="text-sm text-blue-700 font-medium">
                    {pricingMethod === 'rounded' && modalOrder.pricingRule.includes('→') 
                      ? modalOrder.pricingRule.split('(')[1].split(')')[0]
                      : `${modalOrder.chargeableMinutes} dəqiqə × ${(modalOrder.hourlyPrice / 60).toFixed(3)}₼/dəqiqə = ${modalOrder.hourTotal.toFixed(2)}₼`
                    }
                  </span>
                </div>
                
                {modalOrder.freeInfo && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <span className="text-sm text-blue-700 font-medium">{modalOrder.freeInfo}</span>
                  </div>
                )}
                
                {modalOrder.selectedMenu.length > 0 && (
                  <div className="border-t border-gray-200 pt-3">
                    <div className="text-gray-600 mb-2">Məhsullar:</div>
                    {modalOrder.selectedMenu.map((item, index) => {
                      const productId = item._id || item.id;
                      const discount = productDiscounts[productId] || 0;
                      const discountedPrice = calculateProductTotal(item.price, discount);
                      const discountAmount = calculateProductDiscount(item.price, discount);
                      
                      return (
                        <div key={index} className="py-2 border-b border-gray-100 last:border-b-0">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium">{item.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">Endirim:</span>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value={discount}
                                onChange={(e) => {
                                  const newDiscount = Number(e.target.value);
                                  setProductDiscounts(prev => ({
                                    ...prev,
                                    [productId]: newDiscount
                                  }));
                                }}
                                className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-xs"
                                placeholder="0"
                              />
                              <span className="text-xs text-gray-500">%</span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">
                              {item.price}₼
                              {discount > 0 && (
                                <span className="text-red-600 ml-2">
                                  (-{discountAmount.toFixed(2)}₼)
                                </span>
                              )}
                            </span>
                            <span className="font-semibold text-green-700">
                              {discountedPrice.toFixed(2)}₼
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex justify-between items-center py-2 border-t border-gray-100 mt-2">
                      <span className="text-gray-600">Məhsul cəmi:</span>
                      <span className="font-semibold">
                        {calculateMenuTotalWithDiscounts(modalOrder.selectedMenu, productDiscounts).toFixed(2)}₼
                      </span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="text-2xl font-bold text-center text-green-800 mb-6 py-4 bg-green-50 rounded-lg">
                Ümumi: {calculateFinalTotalWithProductDiscounts(modalOrder.hourTotal, modalOrder.selectedMenu, productDiscounts).toFixed(2)}₼
              </div>
            </div>
            
            {/* Fixed Footer with Payment Controls */}
            <div className="p-8 pt-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-gray-700 text-center">Müştərinin verdiyi məbləğ (₼):</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={paidAmount === 0 ? '' : paidAmount}
                    onChange={e => {
                      const value = e.target.value;
                      if (value === '' || value === '0') {
                        setPaidAmount(0);
                      } else {
                        const numValue = parseFloat(value);
                        if (!isNaN(numValue) && numValue >= 0) {
                          setPaidAmount(numValue);
                        }
                      }
                    }}
                    onFocus={e => {
                      if (e.target.value === '0') {
                        e.target.value = '';
                      }
                    }}
                    onBlur={e => {
                      if (e.target.value === '') {
                        setPaidAmount(0);
                        e.target.value = '0';
                      }
                    }}
                    className="border-2 border-gray-300 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 w-full text-center text-xl font-semibold"
                    placeholder="0.00"
                  />
                </div>
                
                {paidAmount > 0 && (
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-700 mb-2">
                      Qaytarılacaq məbləğ: {(paidAmount - calculateFinalTotalWithProductDiscounts(modalOrder.hourTotal, modalOrder.selectedMenu, productDiscounts)).toFixed(2)}₼
                    </div>
                    {paidAmount < calculateFinalTotalWithProductDiscounts(modalOrder.hourTotal, modalOrder.selectedMenu, productDiscounts) && (
                      <div className="text-sm text-red-600">
                        Əlavə ödəniş tələb olunur: {(calculateFinalTotalWithProductDiscounts(modalOrder.hourTotal, modalOrder.selectedMenu, productDiscounts) - paidAmount).toFixed(2)}₼
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex gap-3">
                  <button
                    onClick={() => { setModalOrder(null); setPaidAmount(0); setProductDiscounts({}); }}
                    className="flex-1 px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-semibold transition"
                  >
                    Ləğv et
                  </button>
                  <button
                    onClick={handleCompletePayment}
                    disabled={paidAmount < calculateFinalTotalWithProductDiscounts(modalOrder.hourTotal, modalOrder.selectedMenu, productDiscounts)}
                    className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Ödənişi Tamamla
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTableManagePage; 