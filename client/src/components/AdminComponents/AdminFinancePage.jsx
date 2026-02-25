import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { MASTER_ADMIN_PASSWORD } from '../../config/auth';

const api = axios.create({
  baseURL: import.meta.env.VITE_API || '/api',
});

const AdminFinancePage = () => {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });
  const [ordersDay, setOrdersDay] = useState([]);
  const [ordersMonth, setOrdersMonth] = useState([]);
  const [expensesDay, setExpensesDay] = useState([]);
  const [expensesMonth, setExpensesMonth] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState('');
  const [expenseName, setExpenseName] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseNote, setExpenseNote] = useState('');
  const [expenseRange, setExpenseRange] = useState('month'); // 'day' | 'week' | 'month'
  const [unlocked, setUnlocked] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [deleteModalId, setDeleteModalId] = useState(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletePasswordError, setDeletePasswordError] = useState('');
  const [kassaBalance, setKassaBalance] = useState(null);
  const [kassaBalanceInput, setKassaBalanceInput] = useState('');
  const [kassaSaving, setKassaSaving] = useState(false);
  const [lastKassaUpdate, setLastKassaUpdate] = useState(null);
  const [kassaWithdrawals, setKassaWithdrawals] = useState([]);
  const [withdrawalInput, setWithdrawalInput] = useState('');
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [ordersRange, setOrdersRange] = useState([]);
  const [expensesRange, setExpensesRange] = useState([]);

  const getMonthRange = (dateStr) => {
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const month = d.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 1);
    return { start, end };
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { start, end } = getMonthRange(selectedDate);
      const [dayOrdersRes, monthOrdersRes, dayExpensesRes, monthExpensesRes] = await Promise.all([
        api.get(`/order/GetOrders?date=${selectedDate}`),
        api.get(`/order/GetOrders?from=${start.toISOString()}&to=${end.toISOString()}`),
        api.get(`/expense?date=${selectedDate}`),
        api.get(`/expense?from=${start.toISOString()}&to=${end.toISOString()}`),
      ]);

      setOrdersDay(Array.isArray(dayOrdersRes.data) ? dayOrdersRes.data : []);
      setOrdersMonth(Array.isArray(monthOrdersRes.data) ? monthOrdersRes.data : []);
      setExpensesDay(Array.isArray(dayExpensesRes.data) ? dayExpensesRes.data : []);
      setExpensesMonth(Array.isArray(monthExpensesRes.data) ? monthExpensesRes.data : []);
    } catch (err) {
      setNotification('Maliyyə məlumatları yüklənərkən xəta baş verdi');
      setTimeout(() => setNotification(''), 4000);
      setOrdersDay([]);
      setOrdersMonth([]);
      setExpensesDay([]);
      setExpensesMonth([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  useEffect(() => {
    const { start, end } = getMonthRange(selectedDate);
    setRangeStart(start.toISOString().slice(0, 10));
    const lastDay = new Date(end);
    lastDay.setDate(lastDay.getDate() - 1);
    setRangeEnd(lastDay.toISOString().slice(0, 10));
  }, [selectedDate]);

  useEffect(() => {
    if (!rangeStart || !rangeEnd) return;
    const start = new Date(rangeStart);
    const end = new Date(rangeEnd);
    end.setHours(23, 59, 59, 999);
    const endNext = new Date(end);
    endNext.setDate(endNext.getDate() + 1);
    const fetchRange = async () => {
      try {
        const [ordersRes, expensesRes] = await Promise.all([
          api.get(`/order/GetOrders?from=${start.toISOString()}&to=${endNext.toISOString()}`),
          api.get(`/expense?from=${start.toISOString()}&to=${endNext.toISOString()}`),
        ]);
        setOrdersRange(Array.isArray(ordersRes.data) ? ordersRes.data : []);
        setExpensesRange(Array.isArray(expensesRes.data) ? expensesRes.data : []);
      } catch {
        setOrdersRange([]);
        setExpensesRange([]);
      }
    };
    fetchRange();
  }, [rangeStart, rangeEnd]);

  useEffect(() => {
    if (!unlocked) return;
    const load = async () => {
      try {
        const [balanceRes, updateRes, withdrawalsRes] = await Promise.all([
          api.get('/config/kassaBalance'),
          api.get('/config/lastKassaUpdate'),
          api.get('/config/kassaWithdrawals'),
        ]);
        const v = balanceRes.data?.value;
        const num = typeof v === 'number' ? v : 0;
        setKassaBalance(num);
        setKassaBalanceInput(String(num));
        const last = updateRes.data?.value;
        setLastKassaUpdate(typeof last === 'string' ? last : null);
        const list = withdrawalsRes.data?.value;
        setKassaWithdrawals(Array.isArray(list) ? list : []);
      } catch {
        setKassaBalance(0);
        setKassaBalanceInput('0');
        setLastKassaUpdate(null);
        setKassaWithdrawals([]);
      }
    };
    load();
  }, [unlocked]);

  const dayIncome = useMemo(
    () => ordersDay.reduce((sum, o) => sum + (o.total || 0), 0),
    [ordersDay]
  );
  const monthIncome = useMemo(
    () => ordersMonth.reduce((sum, o) => sum + (o.total || 0), 0),
    [ordersMonth]
  );
  const dayExpense = useMemo(
    () => expensesDay.reduce((sum, e) => sum + (e.amount || 0), 0),
    [expensesDay]
  );
  const monthExpense = useMemo(
    () => expensesMonth.reduce((sum, e) => sum + (e.amount || 0), 0),
    [expensesMonth]
  );

  const dayNet = dayIncome - dayExpense;
  const monthNet = monthIncome - monthExpense;

  const rangeIncome = useMemo(() => ordersRange.reduce((s, o) => s + (o.total || 0), 0), [ordersRange]);
  const rangeExpense = useMemo(() => expensesRange.reduce((s, e) => s + (e.amount || 0), 0), [expensesRange]);
  const rangeNet = rangeIncome - rangeExpense;

  const selectedMonthKey = selectedDate.slice(0, 7);
  const thisMonthWithdrawals = useMemo(() => {
    return kassaWithdrawals
      .filter((w) => (w.date || '').slice(0, 7) === selectedMonthKey)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [kassaWithdrawals, selectedMonthKey]);
  const totalWithdrawn = useMemo(
    () => kassaWithdrawals.reduce((s, w) => s + (Number(w.amount) || 0), 0),
    [kassaWithdrawals]
  );

  const getExpenseDate = (exp) => new Date(exp.date || exp.createdAt);

  const weekRange = useMemo(() => {
    const base = new Date(selectedDate);
    const to = new Date(base);
    to.setHours(23, 59, 59, 999);
    const from = new Date(base);
    from.setDate(from.getDate() - 6);
    from.setHours(0, 0, 0, 0);
    return { from, to };
  }, [selectedDate]);

  const visibleExpenses = useMemo(() => {
    if (expenseRange === 'day') {
      return expensesDay;
    }
    if (expenseRange === 'week') {
      const { from, to } = weekRange;
      return expensesMonth.filter(exp => {
        const d = getExpenseDate(exp);
        return d >= from && d <= to;
      });
    }
    return expensesMonth;
  }, [expenseRange, expensesDay, expensesMonth, weekRange]);

  const visibleExpenseTotal = useMemo(
    () => visibleExpenses.reduce((sum, e) => sum + (e.amount || 0), 0),
    [visibleExpenses]
  );

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!expenseName.trim() || !expenseAmount) return;
    const amount = Number(expenseAmount) || 0;
    if (amount <= 0) return;
    try {
      let currentBalance = kassaBalance !== null ? kassaBalance : null;
      if (currentBalance === null) {
        try {
          const balanceRes = await api.get('/config/kassaBalance');
          const v = balanceRes.data?.value;
          currentBalance = typeof v === 'number' ? v : 0;
        } catch {
          currentBalance = 0;
        }
      }
      if (currentBalance < amount) {
        setNotification('Kassada bu qədər pul yoxdur');
        setTimeout(() => setNotification(''), 3000);
        return;
      }
      const payload = {
        name: expenseName.trim(),
        amount,
        note: expenseNote,
        date: selectedDate,
      };
      const res = await api.post('/expense', payload);
      const created = res.data?.expense;
      if (created) {
        setExpensesDay(prev => [created, ...prev]);
        setExpensesMonth(prev => [created, ...prev]);
        setExpenseName('');
        setExpenseAmount('');
        setExpenseNote('');
        const newBalance = currentBalance - amount;
        await api.put('/config/kassaBalance', { value: newBalance });
        if (unlocked) {
          setKassaBalance(newBalance);
          setKassaBalanceInput(String(newBalance));
        }
        setNotification(`Xərc əlavə olundu. Kassadan ${formatMoney(amount)} çıxıldı.`);
        setTimeout(() => setNotification(''), 4000);
      } else {
        await fetchData();
      }
    } catch (err) {
      setNotification('Xərc əlavə edilərkən xəta baş verdi');
      setTimeout(() => setNotification(''), 4000);
    }
  };

  const openDeleteModal = (id) => {
    setDeleteModalId(id);
    setDeletePassword('');
    setDeletePasswordError('');
  };

  const handleDeleteExpense = async () => {
    if (!deleteModalId) return;
    if (deletePassword !== MASTER_ADMIN_PASSWORD) {
      setDeletePasswordError('Şifrə yanlışdır');
      return;
    }
    const expense = expensesDay.find(e => e._id === deleteModalId) || expensesMonth.find(e => e._id === deleteModalId);
    const amount = expense ? (Number(expense.amount) || 0) : 0;
    try {
      await api.delete(`/expense/${deleteModalId}`);
      setExpensesDay(prev => prev.filter(e => e._id !== deleteModalId));
      setExpensesMonth(prev => prev.filter(e => e._id !== deleteModalId));
      if (amount > 0) {
        let currentBalance = kassaBalance !== null ? kassaBalance : null;
        if (currentBalance === null) {
          try {
            const balanceRes = await api.get('/config/kassaBalance');
            const v = balanceRes.data?.value;
            currentBalance = typeof v === 'number' ? v : 0;
          } catch {
            currentBalance = 0;
          }
        }
        const newBalance = currentBalance + amount;
        await api.put('/config/kassaBalance', { value: newBalance });
        if (unlocked) {
          setKassaBalance(newBalance);
          setKassaBalanceInput(String(newBalance));
        }
        setNotification(`Xərc silindi. ${formatMoney(amount)} kassaya qaytarıldı.`);
      } else {
        setNotification('Xərc silindi');
      }
      setTimeout(() => setNotification(''), 4000);
      setDeleteModalId(null);
      setDeletePassword('');
      setDeletePasswordError('');
    } catch (err) {
      setNotification('Xərc silinərkən xəta baş verdi');
      setTimeout(() => setNotification(''), 4000);
    }
  };

  const formatMoney = (value) => `${value.toFixed(2)}₼`;

  const selectedMonthLabel = useMemo(() => {
    const d = new Date(selectedDate);
    return d.toLocaleDateString('az-AZ', { month: 'long', year: 'numeric' });
  }, [selectedDate]);

  const formatDate = (value) => {
    const d = new Date(value);
    return d.toLocaleDateString('az-AZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handleUnlock = (e) => {
    e.preventDefault();
    if (passwordInput === MASTER_ADMIN_PASSWORD) {
      setUnlocked(true);
      setShowPasswordModal(false);
      setPasswordInput('');
      setPasswordError('');
    } else {
      setPasswordError('Şifrə yanlışdır');
    }
  };

  const handleSaveKassa = async () => {
    const num = parseFloat(kassaBalanceInput);
    if (Number.isNaN(num) || num < 0) {
      setNotification('Kassadakı pul məbləği düzgün daxil edin');
      setTimeout(() => setNotification(''), 3000);
      return;
    }
    setKassaSaving(true);
    try {
      await api.put('/config/kassaBalance', { value: num });
      setKassaBalance(num);
      setNotification('Kassadakı pul yadda saxlanıldı');
      setTimeout(() => setNotification(''), 3000);
    } catch {
      setNotification('Kassa yenilənərkən xəta baş verdi');
      setTimeout(() => setNotification(''), 4000);
    } finally {
      setKassaSaving(false);
    }
  };

  const handleAddNetToKassa = async () => {
    const current = kassaBalance !== null ? kassaBalance : 0;
    const newBalance = current + dayIncome;
    setKassaSaving(true);
    try {
      await Promise.all([
        api.put('/config/kassaBalance', { value: newBalance }),
        api.put('/config/lastKassaUpdate', { value: selectedDate }),
      ]);
      setKassaBalance(newBalance);
      setKassaBalanceInput(String(newBalance));
      setLastKassaUpdate(selectedDate);
      setNotification(`Gəlir (${formatMoney(dayIncome)}) balansa əlavə olundu`);
      setTimeout(() => setNotification(''), 3000);
    } catch {
      setNotification('Balans yenilənərkən xəta baş verdi');
      setTimeout(() => setNotification(''), 4000);
    } finally {
      setKassaSaving(false);
    }
  };

  const handleRevertKassaDay = async () => {
    if (lastKassaUpdate !== selectedDate) return;
    const current = kassaBalance !== null ? kassaBalance : 0;
    const newBalance = Math.max(0, current - dayIncome);
    setKassaSaving(true);
    try {
      await Promise.all([
        api.put('/config/kassaBalance', { value: newBalance }),
        api.put('/config/lastKassaUpdate', { value: '' }),
      ]);
      setKassaBalance(newBalance);
      setKassaBalanceInput(String(newBalance));
      setLastKassaUpdate('');
      setNotification(`Bu günün gəliri (${formatMoney(dayIncome)}) kassadan geri alındı`);
      setTimeout(() => setNotification(''), 3000);
    } catch {
      setNotification('Geri alınarkən xəta baş verdi');
      setTimeout(() => setNotification(''), 4000);
    } finally {
      setKassaSaving(false);
    }
  };

  const kassaNetAlreadyAdded = lastKassaUpdate === selectedDate;

  const handleWithdrawFromKassa = async () => {
    const amount = parseFloat(withdrawalInput);
    if (Number.isNaN(amount) || amount <= 0) {
      setNotification('Çəkilən məbləği düzgün daxil edin');
      setTimeout(() => setNotification(''), 3000);
      return;
    }
    const current = kassaBalance !== null ? kassaBalance : 0;
    if (amount > current) {
      setNotification('Kassada bu qədər pul yoxdur');
      setTimeout(() => setNotification(''), 3000);
      return;
    }
    setKassaSaving(true);
    try {
      const newBalance = current - amount;
      const newEntry = { amount, date: selectedDate };
      const newList = [...kassaWithdrawals, newEntry];
      await Promise.all([
        api.put('/config/kassaBalance', { value: newBalance }),
        api.put('/config/kassaWithdrawals', { value: newList }),
      ]);
      setKassaBalance(newBalance);
      setKassaBalanceInput(String(newBalance));
      setKassaWithdrawals(newList);
      setWithdrawalInput('');
      setNotification(`Kassadan ${formatMoney(amount)} çəkildi. Qalan: ${formatMoney(newBalance)}`);
      setTimeout(() => setNotification(''), 4000);
    } catch {
      setNotification('Kassadan çəkərkən xəta baş verdi');
      setTimeout(() => setNotification(''), 4000);
    } finally {
      setKassaSaving(false);
    }
  };

  const handleDeleteWithdrawal = async (w) => {
    const idx = kassaWithdrawals.findIndex(
      (x) => String(x.date) === String(w.date) && Number(x.amount) === Number(w.amount)
    );
    if (idx === -1) return;
    const amount = Number(w.amount) || 0;
    const newList = kassaWithdrawals.filter((_, i) => i !== idx);
    const current = kassaBalance !== null ? kassaBalance : 0;
    const newBalance = current + amount;
    setKassaSaving(true);
    try {
      await Promise.all([
        api.put('/config/kassaBalance', { value: newBalance }),
        api.put('/config/kassaWithdrawals', { value: newList }),
      ]);
      setKassaBalance(newBalance);
      setKassaBalanceInput(String(newBalance));
      setKassaWithdrawals(newList);
      setNotification(`Çəkilmə silindi. ${formatMoney(amount)} kassaya geri əlavə olundu`);
      setTimeout(() => setNotification(''), 3000);
    } catch {
      setNotification('Çəkilmə silinərkən xəta baş verdi');
      setTimeout(() => setNotification(''), 4000);
    } finally {
      setKassaSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 relative">
      {/* Delete expense password modal */}
      {deleteModalId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm bg-gray-900 text-white rounded-2xl shadow-xl p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-gray-800 rounded-full p-2">
                <i className="bi bi-trash text-red-400 text-xl"></i>
              </div>
              <div>
                <div className="text-lg font-semibold">Xərci silmək üçün şifrə</div>
                <div className="text-xs text-gray-400">Bu əməliyyat kassadan xərci siləcək</div>
              </div>
            </div>
            <form
              onSubmit={e => {
                e.preventDefault();
                handleDeleteExpense();
              }}
              className="space-y-4"
            >
              <input
                type="password"
                inputMode="numeric"
                autoFocus
                value={deletePassword}
                onChange={e => {
                  setDeletePassword(e.target.value);
                  setDeletePasswordError('');
                }}
                placeholder="****"
                className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              {deletePasswordError && <div className="text-sm text-red-400">{deletePasswordError}</div>}
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteModalId(null);
                    setDeletePassword('');
                    setDeletePasswordError('');
                  }}
                  className="flex-1 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm font-semibold"
                >
                  Ləğv et
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-sm font-semibold"
                >
                  Sil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Password Modal */}
      {showPasswordModal && !unlocked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm bg-gray-900 text-white rounded-2xl shadow-xl p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-gray-800 rounded-full p-2">
                <i className="bi bi-shield-lock text-orange-400 text-xl"></i>
              </div>
              <div>
                <div className="text-lg font-semibold">Master admin girişi</div>
                <div className="text-xs text-gray-400">Maliyyə məlumatlarını görmək üçün şifrə daxil et</div>
              </div>
            </div>
            <form onSubmit={handleUnlock} className="space-y-4">
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
                  Geri
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-sm font-semibold"
                >
                  Daxil ol
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Master admin unlock modal */}
      <div className="bg-white shadow-sm rounded-2xl p-5 border mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Kassa və maliyyə</h1>
            <p className="text-sm text-gray-500 mt-1">
              Gündəlik və aylıq gəlir/xərc və xalis qazanc.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <i className="bi bi-calendar-event text-orange-500 text-2xl"></i>
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-gray-600 mb-1">Tarix seç</label>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowPasswordModal(true)}
              className="px-3 py-2 rounded-lg bg-gray-900 text-white text-xs font-semibold flex items-center gap-2 hover:bg-black"
              title="Yalnız master admin üçün"
            >
              <i className="bi bi-key"></i>
              <span className="hidden sm:inline">Master admin</span>
            </button>
          </div>
        </div>
        {notification && (
          <div className="mt-3 px-4 py-2 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800 flex items-center gap-2">
            <i className="bi bi-info-circle"></i>
            <span>{notification}</span>
          </div>
        )}
      </div>

      {/* Header */}
      {unlocked ? (
        <>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-600">Bu gün</span>
              <span className="text-xs text-gray-400">{selectedDate}</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Gəlir</span>
                <span className="text-lg font-bold text-green-700">{formatMoney(dayIncome)}</span>
              </div>
              <div className="flex items-center justify-between border-t pt-2 mt-1">
                <span className="text-sm font-semibold text-gray-700">Günlük xalis qazanc</span>
                <span className="text-xl font-extrabold text-emerald-700">
                  {formatMoney(dayIncome)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white border rounded-2xl p-4 shadow-sm">
            <div className="mb-3">
              <div className="text-sm font-semibold text-gray-600 mb-2">Dövr (başlanğıc – bitiş)</div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs text-gray-500">Başlanğıc</label>
                <input
                  type="date"
                  value={rangeStart}
                  onChange={e => setRangeStart(e.target.value)}
                  className="border px-2 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <span className="text-gray-400">–</span>
                <label className="text-xs text-gray-500">Bitiş</label>
                <input
                  type="date"
                  value={rangeEnd}
                  onChange={e => setRangeEnd(e.target.value)}
                  className="border px-2 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Gəlir</span>
                <span className="text-lg font-bold text-green-700">{formatMoney(rangeIncome)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Xərc</span>
                <span className="text-lg font-bold text-red-600">-{formatMoney(rangeExpense)}</span>
              </div>
              <div className="flex items-center justify-between border-t pt-2 mt-1">
                <span className="text-sm font-semibold text-gray-700">Xalis qazanc</span>
                <span className={`text-xl font-extrabold ${rangeNet >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {formatMoney(rangeNet)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-xl bg-amber-100">
                <i className="bi bi-cash-stack text-amber-600 text-xl"></i>
              </div>
              <span className="text-base font-bold text-gray-800">Kassadakı pul</span>
            </div>

            {kassaBalance !== null && (
              <>
                <p className="text-[10px] uppercase tracking-wider text-amber-700/80 font-medium mb-0.5">Cari balans</p>
                <p className="text-2xl font-extrabold text-amber-800 mb-1">{formatMoney(kassaBalance)}</p>
                <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-4">
                  <i className="bi bi-clock"></i>
                  <span>Hər gecə 03:00-da xalis qazanc əlavə olunur</span>
                </div>
              </>
            )}

            <div className="pt-3 border-t border-amber-200/60 space-y-3">
              <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-white/70">
                <span className="text-xs text-gray-600">Bu gün ({selectedDate}) gəlir (kassaya əlavə olunacaq)</span>
                <span className="text-sm font-bold text-emerald-700">
                  {formatMoney(dayIncome)}
                </span>
              </div>
              {kassaNetAlreadyAdded ? (
                <button
                  type="button"
                  onClick={handleRevertKassaDay}
                  disabled={kassaSaving}
                  className="w-full px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <i className="bi bi-arrow-counterclockwise"></i>
                  Geri al
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleAddNetToKassa}
                  disabled={kassaSaving}
                  className="w-full px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <i className="bi bi-plus-lg"></i>
                  Kassanı yenidən hesabla, əlavə et
                </button>
              )}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-1 block">Balansı redaktə et (₼)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={kassaBalanceInput}
                  onChange={e => setKassaBalanceInput(e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-amber-200 bg-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                />
              </div>
              <button
                type="button"
                onClick={handleSaveKassa}
                disabled={kassaSaving}
                className="w-full px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {kassaSaving ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Saxlanılır...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check2"></i>
                    Yadda saxla
                  </>
                )}
              </button>

              <div className="pt-3 mt-3 border-t border-amber-200/60 space-y-3">
                <p className="text-[10px] uppercase tracking-wider text-amber-700/80 font-medium mb-0.5">Kassadan çəkilib (ümumi)</p>
                <p className="text-lg font-bold text-amber-800">{formatMoney(totalWithdrawn)}</p>

                <p className="text-[10px] uppercase tracking-wider text-gray-600 font-medium mt-2 mb-1.5">
                  Bu ay çəkilənlər ({selectedDate.slice(0, 7)})
                </p>
                {thisMonthWithdrawals.length === 0 ? (
                  <p className="text-xs text-gray-500 py-1">Bu ay hələ çəkilmə yoxdur</p>
                ) : (
                  <ul className="space-y-1.5 max-h-32 overflow-y-auto">
                    {thisMonthWithdrawals.map((w, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between gap-2 py-1.5 px-2.5 rounded-lg bg-white/80 text-sm group"
                      >
                        <span className="text-gray-600">{w.date ? formatDate(w.date) : '—'}</span>
                        <span className="font-semibold text-amber-800">{formatMoney(w.amount || 0)}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteWithdrawal(w)}
                          disabled={kassaSaving}
                          className="p-1 rounded text-red-500 hover:bg-red-100 transition disabled:opacity-50"
                          title="Çəkilməni sil (məbləğ kassaya qaytarılacaq)"
                        >
                          <i className="bi bi-trash text-sm"></i>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-[11px] text-gray-500">
                  Seçilmiş tarixə uyğun aydan kassadan çəkdiyiniz məbləğlər
                </p>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-1 block">Kassadan çək (₼)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={withdrawalInput}
                    onChange={e => setWithdrawalInput(e.target.value)}
                    placeholder="Məs: 3800"
                    className="w-full border border-amber-200 bg-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleWithdrawFromKassa}
                  disabled={kassaSaving || !withdrawalInput.trim()}
                  className="w-full px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <i className="bi bi-bank"></i>
                  Çək və yadda saxla
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Aylıq xərclər siyahısı - Bu gün / Bu ay altında */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm mb-6">
          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-gray-800">
                {expenseRange === 'day' ? 'Günlük' : expenseRange === 'week' ? 'Həftəlik' : 'Aylıq'} xərclər
              </h3>
              <span className="text-sm font-semibold text-orange-600">
                {formatMoney(visibleExpenseTotal)}
              </span>
            </div>
            <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setExpenseRange('day')}
                className={expenseRange === 'day' ? 'px-3 py-1.5 rounded-md text-sm font-semibold bg-orange-600 text-white' : 'px-3 py-1.5 rounded-md text-sm font-medium text-gray-600 hover:bg-white'}
              >
                Gün
              </button>
              <button
                type="button"
                onClick={() => setExpenseRange('week')}
                className={expenseRange === 'week' ? 'px-3 py-1.5 rounded-md text-sm font-semibold bg-orange-600 text-white' : 'px-3 py-1.5 rounded-md text-sm font-medium text-gray-600 hover:bg-white'}
              >
                Həftə
              </button>
              <button
                type="button"
                onClick={() => setExpenseRange('month')}
                className={expenseRange === 'month' ? 'px-3 py-1.5 rounded-md text-sm font-semibold bg-orange-600 text-white' : 'px-3 py-1.5 rounded-md text-sm font-medium text-gray-600 hover:bg-white'}
              >
                Ay
              </button>
            </div>
          </div>
          {visibleExpenses.length === 0 ? (
            <p className="text-sm text-gray-500 py-3">Bu interval üçün xərc yoxdur</p>
          ) : (
            <div className="max-h-56 overflow-y-auto rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Tarix</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Ad</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Məbləğ</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleExpenses.map(exp => (
                    <tr key={exp._id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                      <td className="px-4 py-2.5 text-gray-600">{formatDate(exp.date || exp.createdAt)}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-800">{exp.name}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-red-600">-{formatMoney(exp.amount || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </>
      ) : (
        <div className="mt-2 mb-4 text-center text-gray-500 text-xs sm:text-sm">
          Ümumi gəlir / xərc və geniş xərclər siyahısı yalnız <span className="font-semibold">master admin</span> üçün görünür.
        </div>
      )}

      {/* Bu gün üçün xərc əlavə etmə və bu günün xərcləri - şifrəsiz görünür */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border rounded-2xl p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Bu gün üçün xərc əlavə et</h2>
          <form onSubmit={handleAddExpense} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Xərc adı</label>
              <input
                type="text"
                value={expenseName}
                onChange={e => setExpenseName(e.target.value)}
                placeholder="Məs: Su, qəzet, təmir..."
                className="w-full border px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Məbləğ (₼)</label>
              <input
                type="number"
                value={expenseAmount}
                onChange={e => setExpenseAmount(e.target.value)}
                placeholder="0.00"
                className="w-full border px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Qeyd (isteğe bağlı)</label>
              <textarea
                value={expenseNote}
                onChange={e => setExpenseNote(e.target.value)}
                placeholder="Qısa qeyd yaza bilərsiniz..."
                className="w-full border px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 min-h-[60px]"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-500 transition text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Xərc əlavə et
            </button>
          </form>
        </div>

        <div className="bg-white border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-800">Bu günün xərcləri</h2>
            <span className="text-xs text-gray-500">
              Cəmi: {formatMoney(dayExpense)}
            </span>
          </div>
          {expensesDay.length === 0 ? (
            <div className="text-sm text-gray-500">Bu gün üçün xərc daxil edilməyib.</div>
          ) : (
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold">Ad</th>
                    <th className="text-right px-3 py-2 font-semibold">Məbləğ</th>
                    <th className="text-center px-3 py-2 font-semibold">Əməliyyat</th>
                  </tr>
                </thead>
                <tbody>
                  {expensesDay.map(exp => (
                    <tr key={exp._id} className="border-b last:border-b-0">
                      <td className="px-3 py-2">
                        <div className="font-medium text-gray-800">{exp.name}</div>
                        {exp.note && (
                          <div className="text-xs text-gray-500 truncate max-w-xs">{exp.note}</div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-red-600">
                        -{formatMoney(exp.amount || 0)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => openDeleteModal(exp._id)}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          Sil
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default AdminFinancePage;

