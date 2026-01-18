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
  const [timeInputs, setTimeInputs] = useState({}); // {sessionId: hours}
  const [changePSModal, setChangePSModal] = useState(null); // {session, table}
  const timerRefs = useRef({});
  const audioRef = useRef(null);
  const audioTimeoutRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioSourceRef = useRef(null);
  const audioGainRef = useRef(null);
  const notifiedSessions = useRef(new Set()); // Track which sessions have been notified
  const isProcessingPayment = useRef(false); // Track if payment is being processed
  const isFinishingSession = useRef(false); // Track if session is being finished
  const processedOrderIds = useRef(new Set()); // Track processed order IDs to prevent duplicates

  // Local storage key for temporary menu data
  const LOCAL_STORAGE_KEY = 'table_manage_temp_data';

  // Play loud 7-second music for countdown completion
  const playCountdownSound = () => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio('/bildirim.mp3');
      }

      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }

      const audioContext = audioContextRef.current;
      if (audioContext.state === 'suspended') {
        audioContext.resume().catch(() => {});
      }

      if (!audioSourceRef.current) {
        audioSourceRef.current = audioContext.createMediaElementSource(audioRef.current);
      }

      if (!audioGainRef.current) {
        audioGainRef.current = audioContext.createGain();
        audioSourceRef.current.connect(audioGainRef.current);
        audioGainRef.current.connect(audioContext.destination);
      }

      // Extra amplification (1.0 is normal)
      audioGainRef.current.gain.setValueAtTime(3.0, audioContext.currentTime);

      if (audioTimeoutRef.current) {
        clearTimeout(audioTimeoutRef.current);
      }

      const audio = audioRef.current;
      audio.pause();
      audio.currentTime = 0;
      audio.volume = 1.0;

      audio.play().catch(err => console.error('Audio play error:', err));

      audioTimeoutRef.current = setTimeout(() => {
        audio.pause();
        audio.currentTime = 0;
      }, 7000);
    } catch (error) {
      console.error('Səs çalınarkən xəta:', error);
    }
  };

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
    const elapsedSeconds = Math.floor((now - session.startTime) / 1000);
    const elapsedMinutes = Math.floor(elapsedSeconds / 60);
    
    // Calculate free minutes from selected menu items
    const menuFreeMinutes = session.selectedMenu.reduce((sum, item) => {
      const quantity = item.quantity || 1;
      return sum + ((item.freeMinutes || 0) * quantity);
    }, 0);
    
    // Priority: If both set free time and menu free time exist, prioritize set free time
    const hasSetFreeTime = session.selectedSet && session.setFreeMinutes && session.setFreeMinutes > 0;
    const hasMenuFreeTime = menuFreeMinutes > 0;
    
    // Notification for set free time expiration (priority) - always check, no need for countdownStarted
    if (hasSetFreeTime) {
      const setFreeSeconds = session.setFreeMinutes * 60;
      const sessionKey = `${session._id}_set_${setFreeSeconds}`;
      
      // Check if time has expired (within 1 second tolerance)
      if (elapsedSeconds >= setFreeSeconds && elapsedSeconds < setFreeSeconds + 2) {
        if (!notifiedSessions.current.has(sessionKey)) {
          playCountdownSound(); // Play 5-second music
          setNotification(`${session.tableName} masasında set pulsuz vaxtı bitdi!`);
          setNotificationType('error');
          notifiedSessions.current.add(sessionKey);
          
          setTimeout(() => {
            setNotification('');
            setNotificationType('info');
          }, 5000);
        }
      }
    }
    
    // Notification for menu free time expiration (only if countdown started and no set free time)
    if (!hasSetFreeTime && hasMenuFreeTime && session.countdownStarted && session.countdownStartTime) {
      const countdownElapsedSeconds = Math.floor((Date.now() - session.countdownStartTime) / 1000);
      const menuFreeSeconds = menuFreeMinutes * 60;
      const sessionKey = `${session._id}_menu_${menuFreeSeconds}`;
      
      // Check if time has expired (within 1 second tolerance)
      if (countdownElapsedSeconds >= menuFreeSeconds && countdownElapsedSeconds < menuFreeSeconds + 2) {
        if (!notifiedSessions.current.has(sessionKey)) {
          playCountdownSound(); // Play 5-second music
          setNotification(`${session.tableName} masasında pulsuz vaxt bitdi!`);
          setNotificationType('error');
          notifiedSessions.current.add(sessionKey);
          
          setTimeout(() => {
            setNotification('');
            setNotificationType('info');
          }, 5000);
        }
      }
    }
    
    // Notification for selected time completion (only if countdown started)
    if (session.selectedHours && session.countdownStarted && session.countdownStartTime) {
      const countdownElapsedSeconds = Math.floor((Date.now() - session.countdownStartTime) / 1000);
      const selectedSeconds = session.selectedHours * 3600; // Convert hours to seconds
      const isSetFreeTimeActive = hasSetFreeTime && elapsedSeconds < (session.setFreeMinutes * 60);
      const sessionKey = `${session._id}_selected_${selectedSeconds}`;
      
      // If set free time has ended or no free time exists, check selected time
      if (!isSetFreeTimeActive && !hasMenuFreeTime) {
        // Check if time has expired (within 1 second tolerance)
        if (countdownElapsedSeconds >= selectedSeconds && countdownElapsedSeconds < selectedSeconds + 2) {
          if (!notifiedSessions.current.has(sessionKey)) {
            playCountdownSound(); // Play 5-second music
            setNotification(`${session.tableName} masasında seçilən vaxt tamam oldu!`);
            setNotificationType('error');
            notifiedSessions.current.add(sessionKey);
            
            setTimeout(() => {
              setNotification('');
              setNotificationType('info');
            }, 5000);
          }
        }
      }
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
  // Optimized: use debounce to reduce writes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ sessions, pricingMethod }));
      } catch (err) {
        // Silently handle errors - local storage is not critical
      }
    }, 500); // Debounce: wait 500ms before saving

    return () => clearTimeout(timeoutId);
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
        
        // Categories loaded successfully
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

  // Timer effect for active sessions - optimized to prevent unnecessary re-renders
  useEffect(() => {
    // Only run if there are active sessions
    const activeSessions = sessions.filter(s => s.isActive && s.startTime);
    if (activeSessions.length === 0) return;

    const updateTimers = () => {
      const now = Date.now();
      
      // Use functional update to avoid dependency on sessions
      setSessions(prevSessions => {
        const updatedSessions = prevSessions.map(session => {
          if (session.startTime && session.isActive) {
            const elapsedSeconds = Math.floor((now - session.startTime) / 1000);
            return { ...session, timer: elapsedSeconds };
          }
          return session;
        });

        // Check notification conditions for each session
        // Note: checkNotificationConditions uses tables, products, sessions from closure
        updatedSessions.forEach(session => {
          if (session.startTime && session.isActive) {
            try {
              checkNotificationConditions(session);
            } catch (err) {
              // Silently handle errors in notification checking
            }
          }
        });

        // Update timer in backend for each active session (only every 30 seconds to reduce API calls)
        // Use Promise.all for parallel updates
        const updatePromises = [];
        for (const session of updatedSessions) {
          if (session._id && session.startTime && session.isActive) {
            const elapsedSeconds = Math.floor((now - session.startTime) / 1000);
            // Only update backend every 30 seconds to reduce API calls
            if (elapsedSeconds % 30 === 0 && elapsedSeconds > 0) {
              updatePromises.push(
                api.put(`/tablesession/${session._id}/timer`, {
                  timer: elapsedSeconds
                }).catch(() => {
                  // Silently handle errors - timer update is not critical
                })
              );
            }
          }
        }
        
        // Execute all updates in parallel (non-blocking)
        if (updatePromises.length > 0) {
          Promise.all(updatePromises).catch(() => {
            // Silently handle errors
          });
        }

        return updatedSessions;
      });
    };

    const interval = setInterval(updateTimers, 1000);
    return () => clearInterval(interval);
  }, [sessions.length]); // Only depend on sessions count, not the entire array

  // Start table session - open modal for PS selection
  // Start table session immediately with default PS
  const handleStartClick = async (table) => {
    setLoading(true);
    try {
      // Use default PS if available, otherwise use first available PS or null
      let psType = table.defaultPS || null;
      let hourlyPrice = table.hourlyPrice;
      
      // If no default PS, try to find first available PS
      if (!psType) {
        if (table.ps3Price > 0) {
          psType = 'PS3';
          hourlyPrice = table.ps3Price;
        } else if (table.ps4Price > 0) {
          psType = 'PS4';
          hourlyPrice = table.ps4Price;
        } else if (table.ps5Price > 0) {
          psType = 'PS5';
          hourlyPrice = table.ps5Price;
        }
      } else {
        // Get price based on default PS type
        if (psType === 'PS3' && table.ps3Price > 0) {
          hourlyPrice = table.ps3Price;
        } else if (psType === 'PS4' && table.ps4Price > 0) {
          hourlyPrice = table.ps4Price;
        } else if (psType === 'PS5' && table.ps5Price > 0) {
          hourlyPrice = table.ps5Price;
        }
      }

      const now = Date.now();
      const newSession = {
        tableId: table.id || table._id,
        tableName: table.name,
        startTime: now,
        hourlyPrice: hourlyPrice,
        selectedMenu: [],
        timer: 0,
        isActive: true,
        selectedSet: null,
        setFreeMinutes: null,
        selectedHours: null,
        psType: psType,
        selectedFreeMinutes: null,
        psHistory: psType ? [{
          psType: psType,
          hourlyPrice: hourlyPrice,
          startTime: now,
          endTime: null
        }] : []
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
      
      if (psType) {
        setNotification(`Session başladıldı (${psType}, ${hourlyPrice}₼/saat)`);
        setNotificationType('info');
        setTimeout(() => {
          setNotification('');
          setNotificationType('info');
        }, 3000);
      }
    } catch (err) {
      console.error('Masa başlatılarkən xəta:', err);
      setNotification('Masa başlatılarkən xəta baş verdi');
      setNotificationType('error');
    } finally {
      setLoading(false);
    }
  };


  // Change PS type during active session
  const handleChangePS = (session, table) => {
    setChangePSModal({ session, table });
  };

  // Confirm PS change
  const handleConfirmChangePS = async () => {
    if (!changePSModal || !changePSModal.psType) {
      setNotification('Zəhmət olmasa PS növü seçin');
      setNotificationType('error');
      return;
    }

    const { session, table, psType } = changePSModal;
    setLoading(true);
    try {
      // Get price based on PS type
      let hourlyPrice = table.hourlyPrice;
      if (psType === 'PS3' && table.ps3Price > 0) {
        hourlyPrice = table.ps3Price;
      } else if (psType === 'PS4' && table.ps4Price > 0) {
        hourlyPrice = table.ps4Price;
      } else if (psType === 'PS5' && table.ps5Price > 0) {
        hourlyPrice = table.ps5Price;
      }

      // Update PS type via backend
      await api.put(`/tablesession/${session._id}/changePS`, {
        psType: psType,
        hourlyPrice: hourlyPrice
      });

      // Update local session
      setSessions(prev => prev.map(s => 
        s._id === session._id 
          ? { 
              ...s, 
              psType: psType, 
              hourlyPrice: hourlyPrice,
              psHistory: s.psHistory ? [...s.psHistory] : []
            }
          : s
      ));

      setChangePSModal(null);
      setNotification(`${psType} seçildi, qiymət: ${hourlyPrice}₼/saat`);
      setNotificationType('info');
      setTimeout(() => {
        setNotification('');
        setNotificationType('info');
      }, 3000);
    } catch (err) {
      console.error('PS dəyişdirilərkən xəta:', err);
      setNotification('PS dəyişdirilərkən xəta baş verdi');
      setNotificationType('error');
    } finally {
      setLoading(false);
    }
  };

  // Add menu item to session (both local and backend)
  const handleAddMenuToSession = async (sessionId, menuId) => {
    const selectedProduct = products.find(item => (item._id === menuId || item.id === Number(menuId)));
    if (!selectedProduct) return;

    const updatedSessions = sessions.map(s => {
      if (s._id === sessionId) {
        const existingItemIndex = s.selectedMenu.findIndex(
          item => (item._id || item.id) === (selectedProduct._id || selectedProduct.id)
        );
        
        if (existingItemIndex >= 0) {
          // Product already exists, increase quantity
          const updatedMenu = [...s.selectedMenu];
          updatedMenu[existingItemIndex] = {
            ...updatedMenu[existingItemIndex],
            quantity: (updatedMenu[existingItemIndex].quantity || 1) + 1
          };
          return { ...s, selectedMenu: updatedMenu };
        } else {
          // New product, add with quantity 1
          return { ...s, selectedMenu: [...s.selectedMenu, { ...selectedProduct, quantity: 1 }] };
        }
      }
      return s;
    });
    setSessions(updatedSessions);
    
    // Check if free time exists and auto-start countdown
    const session = updatedSessions.find(s => s._id === sessionId);
    if (session) {
      const menuFreeMinutes = session.selectedMenu.reduce((sum, item) => {
        const quantity = item.quantity || 1;
        return sum + ((item.freeMinutes || 0) * quantity);
      }, 0);
      const hasMenuFreeTime = menuFreeMinutes > 0;
      const hasSetFreeTime = session.selectedSet && session.setFreeMinutes && session.setFreeMinutes > 0;
      
      // Auto-start countdown if free time exists and not already started
      if (hasMenuFreeTime && !session.countdownStarted && !hasSetFreeTime) {
        const now = Date.now();
        try {
          await api.put(`/tablesession/${sessionId}/update`, {
            selectedSet: session.selectedSet || null,
            setFreeMinutes: session.setFreeMinutes || null,
            selectedHours: null,
            countdownStarted: true,
            countdownStartTime: now
          });
          setSessions(prev => prev.map(s => 
            s._id === sessionId 
              ? { ...s, countdownStarted: true, countdownStartTime: now }
              : s
          ));
        } catch (err) {
          console.error('Free vaxt avtomatik başladılarkən xəta:', err);
        }
      }
    }

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
      // Error updating menu in backend
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
    const updatedSessions = sessions.map(s => {
      if (s._id === sessionId) {
        const updatedMenu = s.selectedMenu
          .map(item => {
            if ((item._id || item.id) === menuId) {
              const currentQuantity = item.quantity || 1;
              if (currentQuantity > 1) {
                // Decrease quantity
                return { ...item, quantity: currentQuantity - 1 };
              } else {
                // Remove item (return null to filter out)
                return null;
              }
            }
            return item;
          })
          .filter(item => item !== null);
        return { ...s, selectedMenu: updatedMenu };
      }
      return s;
    });
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

  // Increase quantity of menu item
  const handleIncreaseQuantity = async (sessionId, menuId) => {
    const updatedSessions = sessions.map(s => {
      if (s._id === sessionId) {
        const updatedMenu = s.selectedMenu.map(item => {
          if ((item._id || item.id) === menuId) {
            return { ...item, quantity: (item.quantity || 1) + 1 };
          }
          return item;
        });
        return { ...s, selectedMenu: updatedMenu };
      }
      return s;
    });
    setSessions(updatedSessions);

    // Update in backend
    try {
      const session = updatedSessions.find(s => s._id === sessionId);
      if (session) {
        await api.put(`/tablesession/${sessionId}/menu`, {
          selectedMenu: session.selectedMenu
        });
      }
    } catch (err) {
      // Error updating menu in backend
    }
  };

  // Decrease quantity of menu item
  const handleDecreaseQuantity = async (sessionId, menuId) => {
    const updatedSessions = sessions.map(s => {
      if (s._id === sessionId) {
        const updatedMenu = s.selectedMenu
          .map(item => {
            if ((item._id || item.id) === menuId) {
              const currentQuantity = item.quantity || 1;
              if (currentQuantity > 1) {
                return { ...item, quantity: currentQuantity - 1 };
              } else {
                return null; // Remove if quantity becomes 0
              }
            }
            return item;
          })
          .filter(item => item !== null);
        return { ...s, selectedMenu: updatedMenu };
      }
      return s;
    });
    setSessions(updatedSessions);

    // Update in backend
    try {
      const session = updatedSessions.find(s => s._id === sessionId);
      if (session) {
        await api.put(`/tablesession/${sessionId}/menu`, {
          selectedMenu: session.selectedMenu
        });
      }
    } catch (err) {
      // Error updating menu in backend
    }
  };

  // Finish session: delete from backend, add to finished orders
  const handleFinish = async (session) => {
    // Prevent multiple simultaneous calls
    if (isFinishingSession.current || loading) {
      // Session already being finished
      return;
    }
    
    // Check if session still exists
    const currentSession = sessions.find(s => s._id === session._id);
    if (!currentSession) {
      // Session no longer exists
      return;
    }
    
    isFinishingSession.current = true;
    setLoading(true);
    try {
      const endTime = Date.now();
      const durationMs = endTime - session.startTime;
      const durationMinutes = Math.max(1, Math.round(durationMs / (1000 * 60)));
      
      // Get table to access PS prices
      const table = tables.find(t => (t.id || t._id) === session.tableId);
      
      // Calculate free minutes from menu items and PS price difference (needed for psHistory calculation)
      let menuFreeMinutes = 0;
      let psPriceDifference = 0; // Total price difference for free time
      let freeTimeDetails = [];
      
      session.selectedMenu.forEach(item => {
        const quantity = item.quantity || 1;
        const itemFreeMinutes = (item.freeMinutes || 0) * quantity;
        if (itemFreeMinutes > 0) {
          menuFreeMinutes += itemFreeMinutes;
          
          // Check if free time is for different PS type
          const freeMinutesForPS = item.freeMinutesForPS;
          if (freeMinutesForPS && session.psType && freeMinutesForPS !== session.psType && table) {
            // Get prices
            let freePSPrice = table.hourlyPrice;
            if (freeMinutesForPS === 'PS3' && table.ps3Price > 0) freePSPrice = table.ps3Price;
            else if (freeMinutesForPS === 'PS4' && table.ps4Price > 0) freePSPrice = table.ps4Price;
            else if (freeMinutesForPS === 'PS5' && table.ps5Price > 0) freePSPrice = table.ps5Price;
            
            const currentPSPrice = session.hourlyPrice;
            const priceDiff = currentPSPrice - freePSPrice;
            
            if (priceDiff > 0) {
              // Calculate price difference for free minutes (multiply by quantity)
              const freeHours = itemFreeMinutes / 60;
              const diffAmount = freeHours * priceDiff;
              psPriceDifference += diffAmount;
              freeTimeDetails.push(`${item.name} (${quantity} ədəd): ${itemFreeMinutes} dəq (${freeMinutesForPS} üçün), fərq: ${diffAmount.toFixed(2)}₼`);
            }
          }
        }
      });
      
      // Calculate set free minutes
      const setFreeMinutes = session.setFreeMinutes || 0;
      
      // Selected free minutes from product (manually entered)
      const selectedFreeMinutes = session.selectedFreeMinutes || 0;
      
      // Total free minutes (priority: set free time > selected free minutes > menu free time)
      const totalFreeMinutes = Math.max(setFreeMinutes, Math.max(selectedFreeMinutes, menuFreeMinutes));
      
      // Calculate time and price for each PS type if psHistory exists
      let totalHourTotal = 0;
      let psTimeDetails = [];
      
      if (session.psHistory && session.psHistory.length > 0) {
        // Calculate for each PS period
        session.psHistory.forEach((psPeriod, index) => {
          const periodStartTime = psPeriod.startTime;
          // If endTime is null, it means this is the current active PS period
          const periodEndTime = psPeriod.endTime || endTime;
          const periodDurationMs = periodEndTime - periodStartTime;
          const periodDurationMinutes = Math.max(0, Math.round(periodDurationMs / (1000 * 60)));
          
          if (periodDurationMinutes > 0) {
            // Calculate how much of this period is within free time
            // Period start time relative to session start
            const periodStartRelativeMinutes = Math.floor((periodStartTime - session.startTime) / (1000 * 60));
            const periodEndRelativeMinutes = periodStartRelativeMinutes + periodDurationMinutes;
            
            // Calculate free time that applies to this period
            let freeMinutesForThisPeriod = 0;
            if (totalFreeMinutes > 0) {
              // Free time starts from session start
              const freeTimeEnd = totalFreeMinutes;
              
              // Calculate overlap between period and free time
              const periodStartInFree = Math.max(0, periodStartRelativeMinutes);
              const periodEndInFree = Math.min(periodEndRelativeMinutes, freeTimeEnd);
              
              if (periodEndInFree > periodStartInFree) {
                freeMinutesForThisPeriod = periodEndInFree - periodStartInFree;
              }
            }
            
            // Chargeable minutes for this period (excluding free time)
            const chargeableMinutesForPeriod = Math.max(0, periodDurationMinutes - freeMinutesForThisPeriod);
            
            if (chargeableMinutesForPeriod > 0) {
              // Calculate price for this period (only chargeable minutes)
              let periodHourTotal = 0;
              const periodPricePerMinute = psPeriod.hourlyPrice / 60;
              
              switch (pricingMethod) {
                case '30min':
                  if (chargeableMinutesForPeriod <= 30) {
                    periodHourTotal = psPeriod.hourlyPrice / 2;
                  } else {
                    const fullHours = Math.ceil(chargeableMinutesForPeriod / 60);
                    periodHourTotal = psPeriod.hourlyPrice * fullHours;
                  }
                  break;
                case 'minute':
                  periodHourTotal = chargeableMinutesForPeriod * periodPricePerMinute;
                  break;
                case 'rounded':
                  const exactTotal = chargeableMinutesForPeriod * periodPricePerMinute;
                  const qepik = Math.round(exactTotal * 100) % 100;
                  let roundedQepik = qepik > 0 ? Math.ceil(qepik / 10) * 10 : 0;
                  periodHourTotal = Math.floor(exactTotal) + (roundedQepik / 100);
                  break;
                default:
                  periodHourTotal = chargeableMinutesForPeriod * periodPricePerMinute;
              }
              
              totalHourTotal += periodHourTotal;
              psTimeDetails.push({
                psType: psPeriod.psType,
                durationMinutes: periodDurationMinutes,
                chargeableMinutes: chargeableMinutesForPeriod,
                hourlyPrice: psPeriod.hourlyPrice,
                total: periodHourTotal
              });
            } else {
              // Period is completely within free time, but still show it in details
              psTimeDetails.push({
                psType: psPeriod.psType,
                durationMinutes: periodDurationMinutes,
                chargeableMinutes: 0,
                hourlyPrice: psPeriod.hourlyPrice,
                total: 0
              });
            }
          }
        });
      }
      
      // Free minutes already calculated above
      
      // If set free time exists, only count time after set free time ends
      let chargeableMinutes = 0;
      let freeInfo = '';
      
      if (setFreeMinutes > 0) {
        // Set free time has priority
        if (durationMinutes <= setFreeMinutes) {
          chargeableMinutes = 0;
          freeInfo = `Set pulsuz vaxtı: ${setFreeMinutes} dəqiqə (tam pulsuz)`;
        } else {
          chargeableMinutes = durationMinutes - setFreeMinutes;
          freeInfo = `Set pulsuz vaxtı: ${setFreeMinutes} dəqiqə, əlavə ${chargeableMinutes} dəqiqə üçün hesablandı`;
        }
      } else if (menuFreeMinutes > 0) {
        // Only menu free time
        chargeableMinutes = durationMinutes - menuFreeMinutes;
        if (chargeableMinutes <= 0) {
          chargeableMinutes = 0;
          freeInfo = `Məhsullara görə ${menuFreeMinutes} dəqiqə pulsuz vaxt`;
          if (psPriceDifference > 0) {
            freeInfo += ` (PS qiymət fərqi: +${psPriceDifference.toFixed(2)}₼)`;
          }
        } else {
          freeInfo = `Məhsullara görə ${menuFreeMinutes} dəqiqə pulsuz vaxt, əlavə ${chargeableMinutes} dəqiqə üçün hesablandı`;
          if (psPriceDifference > 0) {
            freeInfo += ` (PS qiymət fərqi: +${psPriceDifference.toFixed(2)}₼)`;
          }
        }
        if (freeTimeDetails.length > 0) {
          freeInfo += `\n${freeTimeDetails.join('\n')}`;
        }
      } else if (selectedFreeMinutes > 0) {
        // Selected free time (manually entered from product)
        chargeableMinutes = durationMinutes - selectedFreeMinutes;
        if (chargeableMinutes <= 0) {
          chargeableMinutes = 0;
          freeInfo = `Seçilən pulsuz vaxt: ${selectedFreeMinutes} dəqiqə (tam pulsuz)`;
        } else {
          freeInfo = `Seçilən pulsuz vaxt: ${selectedFreeMinutes} dəqiqə, əlavə ${chargeableMinutes} dəqiqə üçün hesablandı`;
        }
      } else {
        // No free time - normal calculation
        chargeableMinutes = durationMinutes;
      }

      // Hesablama qaydası seçilən metoda görə
      let hourTotal = 0;
      let pricingRule = '';
      
      // If psHistory exists, use calculated totalHourTotal, otherwise calculate normally
      if (session.psHistory && session.psHistory.length > 0 && totalHourTotal > 0) {
        hourTotal = totalHourTotal;
        pricingRule = `PS dəyişiklikləri ilə hesablanıb (${psTimeDetails.length} dəyişiklik)`;
      } else if (chargeableMinutes > 0) {
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
      
      // Add PS time details to freeInfo
      if (psTimeDetails.length > 0) {
        const psDetailsText = psTimeDetails.map(detail => {
          if (detail.chargeableMinutes === 0 || detail.chargeableMinutes === undefined) {
            return `${detail.psType}: ${detail.durationMinutes} dəq (${detail.hourlyPrice}₼/saat) = 0.00₼ (pulsuz vaxt daxilində)`;
          }
          return `${detail.psType}: ${detail.chargeableMinutes} dəq (${detail.hourlyPrice}₼/saat) = ${detail.total.toFixed(2)}₼`;
        }).join('\n');
        freeInfo = (freeInfo ? freeInfo + '\n\n' : '') + 'PS Dəyişiklikləri:\n' + psDetailsText;
      }

      const menuTotal = session.selectedMenu.reduce((sum, item) => {
        const quantity = item.quantity || 1;
        return sum + (item.price * quantity);
      }, 0);
      // Add PS price difference to total
      const total = hourTotal + menuTotal + psPriceDifference;
      
      const order = {
        tableId: session.tableId,
        tableName: session.tableName,
        startTime: session.startTime,
        endTime,
        durationMinutes,
        hourlyPrice: session.hourlyPrice,
        hourTotal: hourTotal + psPriceDifference, // Include PS price difference in hourTotal
        selectedMenu: session.selectedMenu,
        menuTotal,
        total,
        freeInfo,
        chargeableMinutes,
        pricingRule,
        psType: session.psType,
        psPriceDifference: psPriceDifference,
        psHistory: session.psHistory || [] // Store PS history in order
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
      // Reset flag after a small delay to prevent rapid re-clicks
      setTimeout(() => {
        isFinishingSession.current = false;
      }, 500);
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
      const quantity = item.quantity || 1;
      const productId = item._id || item.id;
      const discount = discounts[productId] || 0;
      const discountedPrice = calculateProductTotal(item.price, discount);
      return sum + (discountedPrice * quantity);
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
    
    // Prevent multiple simultaneous calls
    if (isProcessingPayment.current) {
      // Payment already being processed
      return;
    }
    
    // Create unique order ID to prevent duplicates
    const orderId = `${modalOrder.tableId}_${modalOrder.startTime}_${modalOrder.endTime}_${Date.now()}`;
    
    // Check if this exact order was already processed
    if (processedOrderIds.current.has(orderId)) {
      // Order already processed
      setNotification('Bu sifariş artıq işlənib');
      setNotificationType('warning');
      return;
    }
    
    isProcessingPayment.current = true;
    processedOrderIds.current.add(orderId);
    setLoading(true);
    
    try {
      // Calculate final total with applied product discounts
      const finalTotal = calculateFinalTotalWithProductDiscounts(
        modalOrder.hourTotal, modalOrder.selectedMenu, productDiscounts
      );
      // Prepare order object with discounts (ALWAYS SEND ENDİRİMLİ TOTAL)
      const orderWithDiscount = {
        ...modalOrder,
        total: finalTotal,
        productDiscounts: { ...productDiscounts },
        orderId: orderId // Add unique order ID
      };
      
      // Find session first to ensure it exists
      const session = sessions.find(s => s.tableId === modalOrder.tableId);
      if (!session) {
        processedOrderIds.current.delete(orderId);
        throw new Error('Session tapılmadı');
      }
      
      // Add order to backend (with duplicate check)
      try {
        await api.post('/order/AddOrder', orderWithDiscount);
      } catch (orderError) {
        // If duplicate order error (409), still delete session and show message
        if (orderError.response?.status === 409) {
          // Duplicate order detected, session will be deleted anyway
          setNotification('Bu sifariş artıq yaradılıb, session silindi');
          setNotificationType('warning');
        } else {
          throw orderError; // Re-throw other errors
        }
      }
      
      // Delete session from backend (even if duplicate order)
      try {
        await api.delete(`/tablesession/${session._id}`);
      } catch (deleteError) {
        console.error('Session silinərkən xəta:', deleteError);
        // Continue anyway - session might already be deleted
      }
      
      // Remove from local sessions immediately
      setSessions(prev => prev.filter(s => s._id !== session._id));
      
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
      
      // Clean up processed order ID after 10 seconds (prevent memory leak)
      setTimeout(() => {
        processedOrderIds.current.delete(orderId);
      }, 10000);
      
    } catch (err) {
      console.error('Ödəniş tamamlanarkən xəta:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Ödəniş tamamlanarkən xəta baş verdi';
      setNotification(errorMessage);
      setNotificationType('error');
      
      // Remove from processed list on error
      processedOrderIds.current.delete(orderId);
      
      // Clear notification after 5 seconds for errors
      setTimeout(() => {
        setNotification('');
        setNotificationType('info');
      }, 5000);
    } finally {
      setLoading(false);
      // Reset flag after a small delay to prevent rapid re-clicks
      setTimeout(() => {
        isProcessingPayment.current = false;
      }, 1000); // Increased to 1 second for better protection
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

  // Check for low stock products
  const getLowStockProducts = () => {
    return products.filter(product => {
      const stock = product.stockQuantity || 0;
      return stock === 0 || stock <= 5;
    });
  };

  const lowStockProducts = getLowStockProducts();

  // Get set products
  const availableSetProducts = products.filter(p => p.isSet);

  return (
    <div className="p-3 sm:p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* Order Notifications */}
      {/* Removed as per edit hint */}

      {/* Stock Warning */}
      {lowStockProducts.length > 0 && (
        <div className="bg-red-500 text-white px-3 py-2 mb-3 sm:mb-4 rounded-lg flex items-center gap-2 text-xs sm:text-sm font-semibold">
          <i className="bi bi-exclamation-triangle-fill"></i>
          <span className="break-words">
            {lowStockProducts.length} məhsul stokda yoxdur/bitmək üzrədir - Stoka əlavə edin
          </span>
        </div>
      )}

      {/* Session Status Indicator */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-4 md:p-6 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded-full animate-pulse"></div>
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800">Aktiv Session</h2>
          </div>
          <div className="text-xs sm:text-sm text-gray-600">
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
      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6 md:mb-8 text-gray-800 text-center tracking-tight px-2">Masaların idarəsi</h1>
      
      {/* Hesablama Qaydası Seçimi */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-4 md:p-6 mb-4 sm:mb-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Hesablama Qaydası</h3>
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
          <label className="flex items-start sm:items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-50">
            <input
              type="radio"
              name="pricingMethod"
              value="30min"
              checked={pricingMethod === '30min'}
              onChange={(e) => setPricingMethod(e.target.value)}
              className="w-4 h-4 text-blue-600 mt-0.5 sm:mt-0"
            />
            <span className="text-xs sm:text-sm font-medium text-gray-700">
              30 Dəqiqə Qaydası
              <span className="block text-xs text-gray-500 mt-0.5">1-30 dəqiqə: yarım saat, 31+ dəqiqə: tam saat</span>
            </span>
          </label>
          
          <label className="flex items-start sm:items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-50">
            <input
              type="radio"
              name="pricingMethod"
              value="minute"
              checked={pricingMethod === 'minute'}
              onChange={(e) => setPricingMethod(e.target.value)}
              className="w-4 h-4 text-blue-600 mt-0.5 sm:mt-0"
            />
            <span className="text-xs sm:text-sm font-medium text-gray-700">
              Dəqiqə Əsaslı
              <span className="block text-xs text-gray-500 mt-0.5">Hər dəqiqə üçün dəqiq hesablama</span>
            </span>
          </label>
          
          <label className="flex items-start sm:items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-50">
            <input
              type="radio"
              name="pricingMethod"
              value="rounded"
              checked={pricingMethod === 'rounded'}
              onChange={(e) => setPricingMethod(e.target.value)}
              className="w-4 h-4 text-blue-600 mt-0.5 sm:mt-0"
            />
            <span className="text-xs sm:text-sm font-medium text-gray-700">
              10 Qəpiklik Yuvarlaqlaşdırma
              <span className="block text-xs text-gray-500 mt-0.5">21-29→30, 31-39→40, 41-49→50, 51-59→60, 61-69→70</span>
            </span>
          </label>
        </div>
      </div>
      
      
      {loading && <div className="text-gray-500 mb-4">Yüklənir...</div>}
      {/* error && <div className="text-red-500 mb-4">{error}</div> */} {/* Removed as per edit hint */}
      {notification && (
        <div className={`px-3 sm:px-4 py-2 sm:py-3 rounded mb-3 sm:mb-4 flex items-center gap-2 text-xs sm:text-sm ${
          notificationType === 'error' 
            ? 'bg-red-100 border border-red-400 text-red-700' 
            : notificationType === 'warning' 
            ? 'bg-yellow-100 border border-yellow-400 text-yellow-700' 
            : 'bg-green-100 border border-green-400 text-green-700'
        }`}>
          <i className={`bi flex-shrink-0 ${
            notificationType === 'error' 
              ? 'bi-x-circle' 
              : notificationType === 'warning' 
              ? 'bi-exclamation-triangle' 
              : 'bi-info-circle'
          }`}></i>
          <span className="break-words">{notification}</span>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8 mb-4 sm:mb-6 md:mb-8">
        {safeTables.length === 0 && <div className="col-span-2 text-gray-500">Heç bir masa əlavə edilməyib.</div>}
        {safeTables.map(table => {
          const session = sessions.find(s => s.tableId === (table.id || table._id));
          return (
            <div key={table.id || table._id} className={`relative flex flex-col bg-white shadow-lg rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 border-l-4 sm:border-l-8 ${session ? 'border-orange-500' : 'border-gray-200'} transition group`}
              style={{ minHeight: 'auto' }}>
              <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                <div className="bg-orange-100 p-1.5 sm:p-2 rounded-full">
                  <i className="bi bi-table text-orange-500 text-lg sm:text-xl md:text-2xl"></i>
                </div>
                <span className="font-bold text-gray-800 text-base sm:text-lg md:text-xl flex-1">{table.name}</span>
                <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-semibold whitespace-nowrap ${session ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{session ? 'Aktiv' : 'Boş'}</span>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 mb-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm text-gray-600">Saatlıq qiymət:</span>
                  <span className="text-sm sm:text-base font-semibold text-gray-800">
                    {session ? (session.hourlyPrice || table.hourlyPrice) : table.hourlyPrice}₼
                  </span>
                </div>
                {session?.psType && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-semibold">
                    {session.psType}
                  </span>
                )}
                {session && (
                  <button
                    onClick={() => handleChangePS(session, table)}
                    className="w-full sm:w-auto px-3 py-1.5 sm:py-1 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1"
                    title="PS növünü dəyişdir"
                  >
                    <i className="bi bi-arrow-repeat"></i>
                    PS Dəyişdir
                  </button>
                )}
              </div>
              {!session ? (
                <button onClick={() => handleStartClick(table)} className="mt-3 sm:mt-4 px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition w-full sm:w-fit text-sm sm:text-base">Başlat</button>
              ) : (
                <div className="bg-orange-50 rounded-lg sm:rounded-xl p-3 sm:p-4 mt-2 flex-1 flex flex-col gap-2 border border-orange-200">
                  <div className="flex items-center gap-2 mb-1">
                    <i className="bi bi-clock-history text-orange-400"></i>
                    <span className="text-xs text-gray-500">Başlama vaxtı:</span>
                    <span className="text-sm font-semibold text-gray-700">{formatTime(session.startTime)}</span>
                  </div>
                  
                  {/* Timer Display */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-1 flex-wrap">
                    <i className="bi bi-stopwatch text-blue-600"></i>
                    <span className="text-xs text-gray-500 font-medium">⏱️ Aktiv vaxt:</span>
                    <span 
                      className="text-sm font-semibold px-3 py-2 rounded-lg relative"
                      style={getTimerStyle(session)}
                    >
                      {formatTimer(session.timer || 0)}
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    </span>
                    
                    {/* Time Selection Input and Start Button */}
                    {(() => {
                      const hasSetFreeTime = session.selectedSet && session.setFreeMinutes && session.setFreeMinutes > 0;
                      const menuFreeMinutes = session.selectedMenu.reduce((sum, item) => {
        const quantity = item.quantity || 1;
        return sum + ((item.freeMinutes || 0) * quantity);
      }, 0);
                      const hasMenuFreeTime = menuFreeMinutes > 0;
                      const elapsedMinutes = Math.floor((Date.now() - session.startTime) / (1000 * 60));
                      
                      // Calculate remaining time in seconds for real-time countdown
                      let remainingSeconds = 0;
                      let isCounting = false;
                      let countdownStartTime = session.startTime; // Default to session start time
                      
                      if (session.countdownStartTime) {
                        // Use countdown start time if set
                        countdownStartTime = session.countdownStartTime;
                      }
                      
                      const countdownElapsedSeconds = Math.floor((Date.now() - countdownStartTime) / 1000);
                      
                      // Set free time is active
                      const isSetFreeTimeActive = hasSetFreeTime && elapsedMinutes < session.setFreeMinutes;
                      
                      if (hasMenuFreeTime && session.countdownStarted && !isSetFreeTimeActive) {
                        // Menu free time - counting down (only if set free time is not active)
                        const menuFreeSeconds = menuFreeMinutes * 60;
                        remainingSeconds = Math.max(0, menuFreeSeconds - countdownElapsedSeconds);
                        isCounting = remainingSeconds > 0;
                      } else if (session.selectedHours && session.countdownStarted && !isSetFreeTimeActive) {
                        // Selected hours - counting down (only if set free time is not active)
                        const selectedSeconds = session.selectedHours * 3600; // Convert hours to seconds
                        remainingSeconds = Math.max(0, selectedSeconds - countdownElapsedSeconds);
                        isCounting = remainingSeconds > 0;
                      }
                      
                      // Format remaining time as HH:MM:SS
                      const formatCountdown = (totalSeconds) => {
                        const hours = Math.floor(totalSeconds / 3600);
                        const minutes = Math.floor((totalSeconds % 3600) / 60);
                        const seconds = totalSeconds % 60;
                        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                      };
                      
                      const timeInputValue = timeInputs[session._id] !== undefined ? timeInputs[session._id] : (session.selectedHours || '');
                      
                      // If set has free time, disable input (cannot edit when set free time is active)
                      const isInputDisabled = hasSetFreeTime;
                      
                      return (
                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                          <input
                            type="number"
                            min="0.5"
                            step="0.5"
                            value={timeInputValue}
                            onChange={(e) => {
                              const hours = e.target.value ? parseFloat(e.target.value) : '';
                              setTimeInputs(prev => ({ ...prev, [session._id]: hours }));
                            }}
                            placeholder="Saat"
                            className="w-full sm:w-20 px-2 py-1.5 sm:py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                            disabled={isInputDisabled}
                            title={hasSetFreeTime ? "Set-də free vaxt var, vaxt seçmək olmaz" : ""}
                          />
                          {hasSetFreeTime && (
                            <span className="text-xs text-blue-600 font-semibold">Free vaxt var</span>
                          )}
                          {!hasSetFreeTime && (
                            <button
                              onClick={async () => {
                                const hours = timeInputs[session._id];
                                const now = Date.now();
                                
                                if (hours && hours > 0) {
                                  // Start or update selected hours countdown (allows editing)
                                  try {
                                    await api.put(`/tablesession/${session._id}/update`, {
                                      selectedSet: session.selectedSet || null,
                                      setFreeMinutes: session.setFreeMinutes || null,
                                      selectedHours: hours,
                                      countdownStarted: true,
                                      countdownStartTime: now
                                    });
                                    setSessions(prev => prev.map(s => 
                                      s._id === session._id 
                                        ? { ...s, selectedHours: hours, countdownStarted: true, countdownStartTime: now }
                                        : s
                                    ));
                                    setTimeInputs(prev => {
                                      const newInputs = { ...prev };
                                      delete newInputs[session._id];
                                      return newInputs;
                                    });
                                  } catch (err) {
                                    // Error starting hours
                                  }
                                } else if (hasMenuFreeTime) {
                                  // Start or restart menu free time countdown
                                  try {
                                    await api.put(`/tablesession/${session._id}/update`, {
                                      selectedSet: session.selectedSet || null,
                                      setFreeMinutes: session.setFreeMinutes || null,
                                      selectedHours: null,
                                      countdownStarted: true,
                                      countdownStartTime: now
                                    });
                                    setSessions(prev => prev.map(s => 
                                      s._id === session._id 
                                        ? { ...s, countdownStarted: true, countdownStartTime: now }
                                        : s
                                    ));
                                  } catch (err) {
                                    // Error starting free time
                                  }
                                }
                              }}
                              disabled={!timeInputValue && !hasMenuFreeTime}
                              className="w-full sm:w-auto px-3 py-1.5 sm:py-1 bg-green-500 text-white rounded hover:bg-green-600 transition text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                              title={hasMenuFreeTime && !session.countdownStarted ? "Free vaxtı başlat" : isCounting ? "Yenilə" : "Geri sayımı başlat"}
                            >
                              {isCounting ? "Yenilə" : "Başlat"}
                            </button>
                          )}
                          {isCounting && remainingSeconds > 0 && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 rounded">
                              <i className="bi bi-hourglass-split text-orange-600 text-xs"></i>
                              <span className="text-xs font-semibold text-orange-700 font-mono">
                                {formatCountdown(remainingSeconds)}
                              </span>
                            </div>
                          )}
                          {isCounting && remainingSeconds <= 0 && (
                            <span className="text-xs text-red-600 font-semibold">Vaxt bitib</span>
                          )}
                        </div>
                      );
                    })()}
                    
                  </div>
                  
                  <div className="flex items-center gap-2 mb-1">
                    <i className="bi bi-cash-coin text-green-500"></i>
                    <span className="text-xs text-gray-500">Saatlıq qiymət:</span>
                    <span className="text-sm font-semibold text-gray-700">{table.hourlyPrice}₼</span>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <i className="bi bi-plus-circle text-blue-500"></i>
                      <span className="text-xs text-gray-500">Menyu əlavə et:</span>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      <select
                        value={selectedCategory}
                        onChange={e => {
                          setSelectedCategory(e.target.value);
                        }}
                        className="w-full sm:w-auto border px-2 py-1.5 sm:py-1 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
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
                          className="w-full sm:w-auto border px-2 py-1.5 sm:py-1 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
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
                      {session.selectedMenu.map((item, index) => {
                        const quantity = item.quantity || 1;
                        const itemId = item._id || item.id;
                        return (
                          <div key={itemId || index} className="bg-white border border-orange-200 px-2 sm:px-3 py-1.5 sm:py-2 rounded flex items-center gap-2 sm:gap-3 shadow-sm w-full sm:w-auto">
                            <span className="text-xs sm:text-sm font-medium text-gray-700 flex-1 break-words">{item.name} <span className="text-gray-400">({item.price}₼)</span></span>
                            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                              <button
                                title="Azalt"
                                onClick={() => handleDecreaseQuantity(session._id, itemId)}
                                className="bg-red-100 text-red-600 hover:bg-red-200 px-2 py-1 rounded-full transition text-sm font-bold"
                              >
                                <i className="bi bi-dash"></i>
                              </button>
                              <span className="inline-block bg-orange-100 text-orange-700 text-xs font-bold px-2 sm:px-3 py-0.5 sm:py-1 rounded-full min-w-[1.5rem] sm:min-w-[2rem] text-center">
                                {quantity}
                              </span>
                              <button
                                title="Artır"
                                onClick={() => handleIncreaseQuantity(session._id, itemId)}
                                className="bg-green-100 text-green-600 hover:bg-green-200 px-2 py-1 rounded-full transition text-sm font-bold"
                              >
                                <i className="bi bi-plus"></i>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="flex justify-end mt-2">
                    <button 
                      onClick={() => handleFinish(session)} 
                      disabled={loading}
                      className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                    >
                      {loading ? 'İşlənir...' : 'Bitir'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* Payment Modal */}
      {modalOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-md relative border-t-4 sm:border-t-8 border-green-500 flex flex-col max-h-[95vh] sm:max-h-[90vh] my-auto">
            <button 
              onClick={() => { 
                setModalOrder(null); 
                setPaidAmount(0); 
                setProductDiscounts({}); 
                isFinishingSession.current = false;
              }} 
              className="absolute top-2 sm:top-4 right-2 sm:right-4 text-gray-400 hover:text-gray-600 text-xl sm:text-2xl font-bold z-10 w-8 h-8 sm:w-auto sm:h-auto flex items-center justify-center"
            >
              ×
            </button>
            
            {/* Header - Fixed */}
            <div className="p-4 sm:p-6 md:p-8 pb-3 sm:pb-4 border-b border-gray-100">
              <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-center text-green-700 tracking-tight">Ödəniş Çeki</h2>
              
              <div className="mb-3 sm:mb-4 text-center">
                <div className="text-lg sm:text-xl font-bold text-gray-800 mb-1 sm:mb-2">{modalOrder.tableName}</div>
                <div className="text-xs sm:text-sm text-gray-600">Masa Ödənişi</div>
              </div>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 pt-3 sm:pt-4">
              <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                <div className="flex justify-between items-center py-1.5 sm:py-2 border-b border-gray-100">
                  <span className="text-xs sm:text-sm text-gray-600">Başlama vaxtı:</span>
                  <span className="text-xs sm:text-sm font-semibold">{formatTime(modalOrder.startTime)}</span>
                </div>
                
                <div className="flex justify-between items-center py-1.5 sm:py-2 border-b border-gray-100">
                  <span className="text-xs sm:text-sm text-gray-600">Bitmə vaxtı:</span>
                  <span className="text-xs sm:text-sm font-semibold">{formatTime(modalOrder.endTime)}</span>
                </div>
                
                <div className="flex justify-between items-center py-1.5 sm:py-2 border-b border-gray-100">
                  <span className="text-xs sm:text-sm text-gray-600">Oturma müddəti:</span>
                  <span className="text-xs sm:text-sm font-semibold">{modalOrder.durationMinutes} dəqiqə</span>
                </div>
                
                <div className="flex justify-between items-center py-1.5 sm:py-2 border-b border-gray-100">
                  <span className="text-xs sm:text-sm text-gray-600">Saatlıq qiymət:</span>
                  <span className="text-xs sm:text-sm font-semibold">{modalOrder.hourlyPrice}₼</span>
                </div>
                
                <div className="flex justify-between items-center py-1.5 sm:py-2 border-b border-gray-100">
                  <span className="text-xs sm:text-sm text-gray-600">Hesablanan vaxt:</span>
                  <span className="text-xs sm:text-sm font-semibold">{modalOrder.chargeableMinutes} dəqiqə</span>
                </div>
                
                <div className="flex justify-between items-center py-1.5 sm:py-2 border-b border-gray-100">
                  <span className="text-xs sm:text-sm text-gray-600">Qiymət qaydası:</span>
                  <span className="text-xs sm:text-sm font-semibold text-blue-600 break-words text-right">{modalOrder.pricingRule}</span>
                </div>
                
                <div className="flex justify-between items-center py-1.5 sm:py-2 border-b border-gray-100">
                  <span className="text-xs sm:text-sm text-gray-600">Vaxt cəmi:</span>
                  <span className="text-xs sm:text-sm font-semibold text-blue-600">{modalOrder.hourTotal.toFixed(2)}₼</span>
                </div>
                
                <div className="bg-blue-50 p-2 sm:p-3 rounded-lg mb-2 sm:mb-3">
                  <span className="text-xs sm:text-sm text-blue-700 font-medium">
                    {pricingMethod === 'rounded' && modalOrder.pricingRule.includes('→') 
                      ? modalOrder.pricingRule.split('(')[1].split(')')[0]
                      : `${modalOrder.chargeableMinutes} dəqiqə × ${(modalOrder.hourlyPrice / 60).toFixed(3)}₼/dəqiqə = ${modalOrder.hourTotal.toFixed(2)}₼`
                    }
                  </span>
                </div>
                
                {modalOrder.psType && (
                  <div className="bg-purple-50 p-2 sm:p-3 rounded-lg mb-2 sm:mb-3">
                    <span className="text-xs sm:text-sm text-purple-700 font-medium">
                      PS Növü: <b>{modalOrder.psType}</b>
                    </span>
                  </div>
                )}
                {modalOrder.psPriceDifference > 0 && (
                  <div className="bg-orange-50 p-2 sm:p-3 rounded-lg mb-2 sm:mb-3">
                    <span className="text-xs sm:text-sm text-orange-700 font-medium">
                      PS Qiymət Fərqi: <b>+{modalOrder.psPriceDifference.toFixed(2)}₼</b>
                      <div className="text-xs mt-1 text-orange-600">
                        (Fərqli PS-də oynayıb, pulsuz vaxt üçün qiymət fərqi əlavə edildi)
                      </div>
                    </span>
                  </div>
                )}
                {modalOrder.freeInfo && (
                  <div className="bg-blue-50 p-2 sm:p-3 rounded-lg">
                    <span className="text-xs sm:text-sm text-blue-700 font-medium whitespace-pre-line break-words">{modalOrder.freeInfo}</span>
                  </div>
                )}
                
                {modalOrder.selectedMenu.length > 0 && (
                  <div className="border-t border-gray-200 pt-3">
                    <div className="text-gray-600 mb-2">Məhsullar:</div>
                    {modalOrder.selectedMenu.map((item, index) => {
                      const productId = item._id || item.id;
                      const quantity = item.quantity || 1;
                      const discount = productDiscounts[productId] || 0;
                      const discountedPrice = calculateProductTotal(item.price, discount);
                      const discountAmount = calculateProductDiscount(item.price, discount);
                      const totalPrice = discountedPrice * quantity;
                      const totalDiscountAmount = discountAmount * quantity;
                      
                      return (
                        <div key={index} className="py-2 border-b border-gray-100 last:border-b-0">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium">
                              {item.name}
                              {quantity > 1 && <span className="text-gray-500 ml-1">(x{quantity})</span>}
                            </span>
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
                              {item.price}₼ {quantity > 1 && <span className="text-gray-400">× {quantity}</span>}
                              {discount > 0 && (
                                <span className="text-red-600 ml-2">
                                  (-{totalDiscountAmount.toFixed(2)}₼)
                                </span>
                              )}
                            </span>
                            <span className="font-semibold text-green-700">
                              {totalPrice.toFixed(2)}₼
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
              
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-center text-green-800 mb-4 sm:mb-6 py-3 sm:py-4 bg-green-50 rounded-lg px-2">
                Ümumi: {calculateFinalTotalWithProductDiscounts(modalOrder.hourTotal, modalOrder.selectedMenu, productDiscounts).toFixed(2)}₼
              </div>
            </div>
            
            {/* Fixed Footer with Payment Controls */}
            <div className="p-4 sm:p-6 md:p-8 pt-3 sm:pt-4 border-t border-gray-100 bg-gray-50 rounded-b-xl sm:rounded-b-2xl">
              <div className="space-y-3 sm:space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-sm sm:text-base text-gray-700 text-center">Müştərinin verdiyi məbləğ (₼):</label>
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
                    className="border-2 border-gray-300 px-3 sm:px-4 py-2 sm:py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 w-full text-center text-lg sm:text-xl font-semibold"
                    placeholder="0.00"
                  />
                </div>
                
                {paidAmount > 0 && (
                  <div className="text-center">
                    <div className="text-base sm:text-lg font-bold text-blue-700 mb-1 sm:mb-2">
                      Qaytarılacaq məbləğ: {(paidAmount - calculateFinalTotalWithProductDiscounts(modalOrder.hourTotal, modalOrder.selectedMenu, productDiscounts)).toFixed(2)}₼
                    </div>
                    {paidAmount < calculateFinalTotalWithProductDiscounts(modalOrder.hourTotal, modalOrder.selectedMenu, productDiscounts) && (
                      <div className="text-xs sm:text-sm text-red-600">
                        Əlavə ödəniş tələb olunur: {(calculateFinalTotalWithProductDiscounts(modalOrder.hourTotal, modalOrder.selectedMenu, productDiscounts) - paidAmount).toFixed(2)}₼
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <button
                    onClick={() => { 
                      setModalOrder(null); 
                      setPaidAmount(0); 
                      setProductDiscounts({}); 
                      isFinishingSession.current = false;
                    }}
                    className="w-full sm:flex-1 px-4 py-2.5 sm:py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-semibold transition text-sm sm:text-base"
                  >
                    Ləğv et
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleCompletePayment();
                    }}
                    disabled={loading || isProcessingPayment.current || paidAmount < calculateFinalTotalWithProductDiscounts(modalOrder.hourTotal, modalOrder.selectedMenu, productDiscounts)}
                    className="w-full sm:flex-1 px-4 py-2.5 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                  >
                    {loading || isProcessingPayment.current ? 'İşlənir...' : 'Ödənişi Tamamla'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change PS Modal */}
      {changePSModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-md relative border-t-4 sm:border-t-8 border-purple-500 my-auto">
            <button 
              onClick={() => setChangePSModal(null)} 
              className="absolute top-2 sm:top-4 right-2 sm:right-4 text-gray-400 hover:text-gray-600 text-xl sm:text-2xl font-bold z-10 w-8 h-8 sm:w-auto sm:h-auto flex items-center justify-center"
            >
              ×
            </button>
            
            <div className="p-4 sm:p-6 md:p-8">
              <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-center text-purple-700">PS Növünü Dəyişdir</h2>
              
              <div className="mb-4 sm:mb-6">
                <div className="text-base sm:text-lg font-bold text-gray-800 mb-1 sm:mb-2 text-center">{changePSModal.table.name}</div>
                <div className="text-xs sm:text-sm text-gray-600 text-center">
                  Cari PS: <b>{changePSModal.session.psType || 'Seçilməyib'}</b> ({changePSModal.session.hourlyPrice}₼/saat)
                </div>
              </div>

              {/* PS Type Selection */}
              <div className="mb-4 sm:mb-6">
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">Yeni PS növü seçin:</label>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {changePSModal.table.ps3Price > 0 && (
                    <button
                      onClick={() => setChangePSModal({...changePSModal, psType: 'PS3'})}
                      className={`px-2 sm:px-4 py-2 sm:py-3 rounded-lg font-semibold transition ${
                        changePSModal.psType === 'PS3'
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <div className="text-sm sm:text-lg font-bold">PS3</div>
                      <div className="text-xs">{changePSModal.table.ps3Price}₼/saat</div>
                    </button>
                  )}
                  {changePSModal.table.ps4Price > 0 && (
                    <button
                      onClick={() => setChangePSModal({...changePSModal, psType: 'PS4'})}
                      className={`px-2 sm:px-4 py-2 sm:py-3 rounded-lg font-semibold transition ${
                        changePSModal.psType === 'PS4'
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <div className="text-sm sm:text-lg font-bold">PS4</div>
                      <div className="text-xs">{changePSModal.table.ps4Price}₼/saat</div>
                    </button>
                  )}
                  {changePSModal.table.ps5Price > 0 && (
                    <button
                      onClick={() => setChangePSModal({...changePSModal, psType: 'PS5'})}
                      className={`px-2 sm:px-4 py-2 sm:py-3 rounded-lg font-semibold transition ${
                        changePSModal.psType === 'PS5'
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <div className="text-sm sm:text-lg font-bold">PS5</div>
                      <div className="text-xs">{changePSModal.table.ps5Price}₼/saat</div>
                    </button>
                  )}
                </div>
                {!changePSModal.table.ps3Price && !changePSModal.table.ps4Price && !changePSModal.table.ps5Price && (
                  <div className="text-xs sm:text-sm text-gray-500 text-center mt-2">PS qiymətləri təyin edilməyib</div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={() => setChangePSModal(null)}
                  className="w-full sm:flex-1 px-4 py-2.5 sm:py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-semibold transition text-sm sm:text-base"
                >
                  Ləğv et
                </button>
                <button
                  onClick={handleConfirmChangePS}
                  disabled={loading || !changePSModal.psType || changePSModal.psType === changePSModal.session.psType}
                  className="w-full sm:flex-1 px-4 py-2.5 sm:py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  {loading ? 'Dəyişdirilir...' : 'Dəyişdir'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminTableManagePage; 