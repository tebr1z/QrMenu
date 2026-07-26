import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createApiClient, fetchAllSettled } from '../../utils/http';
import { MASTER_ADMIN_PASSWORD } from '../../config/auth';
import { ContextUser } from '../../context/CheckUserContext';
import { isMasterAdmin } from '../../config/roles';
import {
  toLocalDateStr,
  parseLocalDateStart,
  getLocalMonthRange,
  getLocalWeekRange,
} from '../../utils/localDate';

const apiClient = createApiClient();

function isOperationalExpense(exp) {
  if (!exp) return false;
  if (exp.kind === 'employee_salary') return false;
  if (String(exp.name || '').startsWith('İşçi maaşı:')) return false;
  return true;
}

function sumAmounts(list, pick = (x) => x.amount) {
  return list.reduce((s, item) => s + (Number(pick(item)) || 0), 0);
}

/** Çıxış sətri: həmişə düzgün işarə (reversal müsbət ola bilər) */
function formatSignedMoney(value, formatMoney) {
  const n = Number(value) || 0;
  if (n < 0) return `+${formatMoney(Math.abs(n))}`;
  return `-${formatMoney(n)}`;
}

const AdminFinancePage = () => {
  const { userRole } = useContext(ContextUser);
  const isMaster = isMasterAdmin(userRole);
  const [selectedDate, setSelectedDate] = useState(() => toLocalDateStr());
  const [ordersDay, setOrdersDay] = useState([]);
  const [ordersMonth, setOrdersMonth] = useState([]);
  const [expensesDay, setExpensesDay] = useState([]);
  const [expensesMonth, setExpensesMonth] = useState([]);
  const [expensesWeek, setExpensesWeek] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState('');
  const [editUnlocked, setEditUnlocked] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [pendingAction, setPendingAction] = useState(null);
  const [expenseName, setExpenseName] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseNote, setExpenseNote] = useState('');
  const [expenseRange, setExpenseRange] = useState('month'); // 'day' | 'week' | 'month'
  const [kassaBalance, setKassaBalance] = useState(null);
  const [kassaBalanceInput, setKassaBalanceInput] = useState('');
  const [kassaSaving, setKassaSaving] = useState(false);
  const [kassaWithdrawals, setKassaWithdrawals] = useState([]);
  const [payrollReport, setPayrollReport] = useState(null);
  const [rangePayrollTotal, setRangePayrollTotal] = useState(0);
  const [showArchive, setShowArchive] = useState(false);
  const [selectedArchiveKey, setSelectedArchiveKey] = useState('');
  const [payrollFilter, setPayrollFilter] = useState('period');
  const [withdrawalToDelete, setWithdrawalToDelete] = useState(null);
  const [deletingWithdrawal, setDeletingWithdrawal] = useState(false);
  const [withdrawalInput, setWithdrawalInput] = useState('');
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [ordersRange, setOrdersRange] = useState([]);
  const [expensesRange, setExpensesRange] = useState([]);

  const loadKassaData = useCallback(async () => {
    try {
      const settled = await fetchAllSettled([
        apiClient.get('/config/kassaBalance'),
        apiClient.get('/config/kassaWithdrawals'),
      ]);
      const [balanceRes, withdrawalsRes] = settled;
      if (balanceRes.ok) {
        const v = balanceRes.data?.value;
        const num = typeof v === 'number' ? v : 0;
        setKassaBalance(num);
        setKassaBalanceInput(String(num));
      }
      if (withdrawalsRes.ok) {
        const list = withdrawalsRes.data?.value;
        setKassaWithdrawals(Array.isArray(list) ? list : []);
      }
    } catch {
      setKassaBalance(0);
      setKassaBalanceInput('0');
      setKassaWithdrawals([]);
    }
  }, []);

  const loadPayrollReport = useCallback(async () => {
    try {
      const res = await apiClient.get(`/employee/payroll/finance?date=${selectedDate}`);
      setPayrollReport(res.data);
    } catch {
      setPayrollReport(null);
    }
  }, [selectedDate]);

  const fetchWeekExpenses = useCallback(async (dateStr) => {
    const { fromStr, toStr } = getLocalWeekRange(dateStr);
    try {
      const res = await apiClient.get(`/expense?from=${fromStr}&to=${toStr}`);
      setExpensesWeek(
        Array.isArray(res.data) ? res.data.filter(isOperationalExpense) : []
      );
    } catch {
      setExpensesWeek([]);
    }
  }, []);

  const fetchRangeData = useCallback(async (fromStr, toStr) => {
    if (!fromStr || !toStr) return;
    try {
      const settled = await fetchAllSettled([
        apiClient.get(`/order/GetOrders?from=${fromStr}&to=${toStr}`),
        apiClient.get(`/expense?from=${fromStr}&to=${toStr}`),
        apiClient.get(`/employee/withdrawals/all?from=${fromStr}&to=${toStr}`),
      ]);
      const [ordersRes, expensesRes, payrollRes] = settled;
      setOrdersRange(ordersRes.ok && Array.isArray(ordersRes.data) ? ordersRes.data : []);
      setExpensesRange(
        expensesRes.ok && Array.isArray(expensesRes.data)
          ? expensesRes.data.filter(isOperationalExpense)
          : []
      );
      if (payrollRes.ok) {
        const total = typeof payrollRes.data?.total === 'number'
          ? payrollRes.data.total
          : sumAmounts(Array.isArray(payrollRes.data?.withdrawals) ? payrollRes.data.withdrawals : []);
        setRangePayrollTotal(total);
      } else {
        setRangePayrollTotal(0);
      }
    } catch {
      setOrdersRange([]);
      setExpensesRange([]);
      setRangePayrollTotal(0);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { startStr, endExclusiveStr } = getLocalMonthRange(selectedDate);
      const monthLast = parseLocalDateStart(endExclusiveStr);
      monthLast.setDate(monthLast.getDate() - 1);
      const monthEndStr = toLocalDateStr(monthLast);

      const settled = await fetchAllSettled([
        apiClient.get(`/order/GetOrders?date=${selectedDate}`),
        apiClient.get(`/order/GetOrders?from=${startStr}&to=${monthEndStr}`),
        apiClient.get(`/expense?date=${selectedDate}`),
        apiClient.get(`/expense?from=${startStr}&to=${monthEndStr}`),
      ]);
      const [dayOrdersRes, monthOrdersRes, dayExpensesRes, monthExpensesRes] = settled;

      setOrdersDay(dayOrdersRes.ok && Array.isArray(dayOrdersRes.data) ? dayOrdersRes.data : []);
      setOrdersMonth(monthOrdersRes.ok && Array.isArray(monthOrdersRes.data) ? monthOrdersRes.data : []);
      setExpensesDay(
        dayExpensesRes.ok && Array.isArray(dayExpensesRes.data)
          ? dayExpensesRes.data.filter(isOperationalExpense)
          : []
      );
      setExpensesMonth(
        monthExpensesRes.ok && Array.isArray(monthExpensesRes.data)
          ? monthExpensesRes.data.filter(isOperationalExpense)
          : []
      );

      await loadKassaData();
      await loadPayrollReport();
      if (expenseRange === 'week') {
        await fetchWeekExpenses(selectedDate);
      }

      if (settled.some((r) => !r.ok)) {
        setNotification('Bəzi maliyyə məlumatları qismən yüklənmədi');
        setTimeout(() => setNotification(''), 4000);
      }
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
  }, [selectedDate, expenseRange, loadKassaData, loadPayrollReport, fetchWeekExpenses]);

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  useEffect(() => {
    const { startStr, endExclusiveStr } = getLocalMonthRange(selectedDate);
    const monthLast = parseLocalDateStart(endExclusiveStr);
    monthLast.setDate(monthLast.getDate() - 1);
    setRangeStart(startStr);
    setRangeEnd(toLocalDateStr(monthLast));
  }, [selectedDate]);

  useEffect(() => {
    if (!rangeStart || !rangeEnd) return;
    fetchRangeData(rangeStart, rangeEnd);
  }, [rangeStart, rangeEnd, fetchRangeData]);

  useEffect(() => {
    if (expenseRange === 'week') {
      fetchWeekExpenses(selectedDate);
    }
  }, [expenseRange, selectedDate, fetchWeekExpenses]);

  const dayIncome = useMemo(
    () => sumAmounts(ordersDay, (o) => o.total),
    [ordersDay]
  );
  const dayExpense = useMemo(
    () => sumAmounts(expensesDay),
    [expensesDay]
  );

  // Maaş — EmployeeWithdrawal (payrollReport); sahib çəkilməsi — kassa jurnalı
  const dayPayrollOut = useMemo(
    () => Number(payrollReport?.today?.total) || 0,
    [payrollReport]
  );
  const dayOwnerOut = useMemo(
    () =>
      sumAmounts(
        kassaWithdrawals.filter(
          (w) => (w.date || '').slice(0, 10) === selectedDate && w.source !== 'employee'
        )
      ),
    [kassaWithdrawals, selectedDate]
  );
  const dayCashOut = dayPayrollOut + dayOwnerOut;
  const dayNet = dayIncome - dayExpense - dayCashOut;

  const selectedMonthKey = selectedDate.slice(0, 7);
  const thisMonthWithdrawals = useMemo(() => {
    return kassaWithdrawals
      .filter((w) => (w.date || w.at || '').slice(0, 7) === selectedMonthKey)
      .sort((a, b) => (b.at || b.date || '').localeCompare(a.at || a.date || ''));
  }, [kassaWithdrawals, selectedMonthKey]);

  const rangeIncome = useMemo(() => sumAmounts(ordersRange, (o) => o.total), [ordersRange]);
  const rangeExpense = useMemo(() => sumAmounts(expensesRange), [expensesRange]);
  const rangePayrollOut = rangePayrollTotal;
  const rangeOwnerOut = useMemo(
    () =>
      sumAmounts(
        kassaWithdrawals.filter((w) => {
          const d = (w.date || '').slice(0, 10);
          return d >= rangeStart && d <= rangeEnd && w.source !== 'employee';
        })
      ),
    [kassaWithdrawals, rangeStart, rangeEnd]
  );
  const rangeCashOut = rangePayrollOut + rangeOwnerOut;
  const rangeNet = rangeIncome - rangeExpense - rangeCashOut;

  const totalWithdrawn = useMemo(
    () => sumAmounts(kassaWithdrawals),
    [kassaWithdrawals]
  );

  const visibleExpenses = useMemo(() => {
    if (expenseRange === 'day') return expensesDay;
    if (expenseRange === 'week') return expensesWeek;
    return expensesMonth;
  }, [expenseRange, expensesDay, expensesWeek, expensesMonth]);

  const visibleExpenseTotal = useMemo(
    () => sumAmounts(visibleExpenses),
    [visibleExpenses]
  );

  const syncExpenseIntoRange = (expense, mode) => {
    if (!expense?._id || !rangeStart || !rangeEnd) return;
    const d = toLocalDateStr(parseLocalDateStart(expense.date || expense.createdAt || selectedDate));
    if (d < rangeStart || d > rangeEnd) return;
    if (mode === 'add') {
      setExpensesRange((prev) => [expense, ...prev.filter((e) => e._id !== expense._id)]);
    } else {
      setExpensesRange((prev) => prev.filter((e) => e._id !== expense._id));
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!expenseName.trim() || !expenseAmount) return;
    const amount = Number(expenseAmount) || 0;
    if (amount <= 0) return;
    try {
      const payload = {
        name: expenseName.trim(),
        amount,
        note: expenseNote,
        date: selectedDate,
      };
      const res = await apiClient.post('/expense', payload);
      const created = res.data?.expense;
      if (created) {
        setExpensesDay((prev) => [created, ...prev]);
        setExpensesMonth((prev) => [created, ...prev]);
        setExpensesWeek((prev) => {
          const { fromStr, toStr } = getLocalWeekRange(selectedDate);
          const d = toLocalDateStr(parseLocalDateStart(created.date || selectedDate));
          if (d >= fromStr && d <= toStr) return [created, ...prev];
          return prev;
        });
        syncExpenseIntoRange(created, 'add');
        setExpenseName('');
        setExpenseAmount('');
        setExpenseNote('');
        if (typeof res.data?.kassaBalance === 'number') {
          setKassaBalance(res.data.kassaBalance);
          setKassaBalanceInput(String(res.data.kassaBalance));
        } else {
          await loadKassaData();
        }
        setNotification(`Xərc əlavə olundu. Kassadan ${formatMoney(amount)} çıxıldı.`);
        setTimeout(() => setNotification(''), 4000);
      } else {
        await fetchData();
        if (rangeStart && rangeEnd) await fetchRangeData(rangeStart, rangeEnd);
      }
    } catch (err) {
      setNotification(err.response?.data?.error || 'Xərc əlavə edilərkən xəta baş verdi');
      setTimeout(() => setNotification(''), 4000);
    }
  };

  const handleDeleteExpense = async (deleteId) => {
    if (!deleteId) return;
    if (!isMaster || !editUnlocked) {
      setNotification('Xərc silmək yalnız Master Admin + redaktə kilidi ilə mümkündür');
      setTimeout(() => setNotification(''), 4000);
      return;
    }
    if (!window.confirm('Bu xərci silmək istəyirsiniz?')) return;
    const expense =
      expensesDay.find((e) => e._id === deleteId) ||
      expensesMonth.find((e) => e._id === deleteId) ||
      expensesWeek.find((e) => e._id === deleteId);
    const amount = expense ? Number(expense.amount) || 0 : 0;
    try {
      const res = await apiClient.delete(`/expense/${deleteId}`);
      setExpensesDay((prev) => prev.filter((e) => e._id !== deleteId));
      setExpensesMonth((prev) => prev.filter((e) => e._id !== deleteId));
      setExpensesWeek((prev) => prev.filter((e) => e._id !== deleteId));
      if (expense) syncExpenseIntoRange(expense, 'remove');
      else setExpensesRange((prev) => prev.filter((e) => e._id !== deleteId));
      if (typeof res.data?.kassaBalance === 'number') {
        setKassaBalance(res.data.kassaBalance);
        setKassaBalanceInput(String(res.data.kassaBalance));
      } else {
        await loadKassaData();
      }
      setNotification(
        amount > 0
          ? `Xərc silindi. ${formatMoney(amount)} kassaya qaytarıldı.`
          : 'Xərc silindi'
      );
      setTimeout(() => setNotification(''), 4000);
    } catch (err) {
      setNotification(err.response?.data?.error || 'Xərc silinərkən xəta baş verdi');
      setTimeout(() => setNotification(''), 4000);
    }
  };

  const formatMoney = (value) => `${(Number(value) || 0).toFixed(2)}₼`;

  const formatDate = (value) => {
    const raw = String(value || '');
    const d =
      /^\d{4}-\d{2}-\d{2}/.test(raw) && raw.length <= 10
        ? parseLocalDateStart(raw)
        : new Date(value);
    return d.toLocaleDateString('az-AZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
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
      await apiClient.put('/config/kassaBalance', { value: num });
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

  const handleWithdrawFromKassa = async () => {
    const amount = parseFloat(withdrawalInput);
    if (Number.isNaN(amount) || amount <= 0) {
      setNotification('Çəkilən məbləği düzgün daxil edin');
      setTimeout(() => setNotification(''), 3000);
      return;
    }
    setKassaSaving(true);
    try {
      const res = await apiClient.post('/config/kassa/withdraw', {
        amount,
        label: 'Kassadan çəkilmə',
      });
      const newBalance = typeof res.data?.balance === 'number' ? res.data.balance : null;
      if (newBalance !== null) {
        setKassaBalance(newBalance);
        setKassaBalanceInput(String(newBalance));
      }
      await loadKassaData();
      setWithdrawalInput('');
      setNotification(`Kassadan ${formatMoney(amount)} çəkildi${newBalance !== null ? `. Qalan: ${formatMoney(newBalance)}` : ''}`);
      setTimeout(() => setNotification(''), 4000);
    } catch (err) {
      setNotification(err.response?.data?.error || 'Kassadan çəkərkən xəta baş verdi');
      setTimeout(() => setNotification(''), 4000);
    } finally {
      setKassaSaving(false);
    }
  };

  const handleDeleteEmployeeWithdrawal = async () => {
    if (!withdrawalToDelete?.id) return;
    setDeletingWithdrawal(true);
    try {
      const res = await apiClient.delete(`/employee/withdrawals/${withdrawalToDelete.id}`);
      if (typeof res.data?.kassaBalance === 'number') {
        setKassaBalance(res.data.kassaBalance);
        setKassaBalanceInput(String(res.data.kassaBalance));
      }
      await loadPayrollReport();
      await loadKassaData();
      if (rangeStart && rangeEnd) await fetchRangeData(rangeStart, rangeEnd);
      setWithdrawalToDelete(null);
      setNotification('Maaş çıxışı silindi. Pul kassaya qaytarıldı, işçi həmin günü yenidən götürə bilər.');
      setTimeout(() => setNotification(''), 4000);
    } catch (err) {
      setNotification(err.response?.data?.error || 'Maaş çıxışı silinərkən xəta baş verdi');
      setTimeout(() => setNotification(''), 4000);
    } finally {
      setDeletingWithdrawal(false);
    }
  };

  const handleDeleteWithdrawal = async (w) => {
    if (w.source === 'employee') {
      setNotification('İşçi maaşı çıxışını maaş bölməsindən silin');
      setTimeout(() => setNotification(''), 3000);
      return;
    }
    setKassaSaving(true);
    try {
      const res = await apiClient.post('/config/kassa/withdraw/reverse', {
        createdAt: w.createdAt,
        date: w.date,
        amount: w.amount,
        label: w.label,
      });
      if (typeof res.data?.balance === 'number') {
        setKassaBalance(res.data.balance);
        setKassaBalanceInput(String(res.data.balance));
      }
      if (Array.isArray(res.data?.list)) {
        setKassaWithdrawals(res.data.list);
      } else {
        await loadKassaData();
      }
      setNotification(`Çəkilmə silindi. ${formatMoney(Number(w.amount) || 0)} kassaya geri əlavə olundu`);
      setTimeout(() => setNotification(''), 3000);
    } catch (err) {
      setNotification(err.response?.data?.error || 'Çəkilmə silinərkən xəta baş verdi');
      setTimeout(() => setNotification(''), 4000);
    } finally {
      setKassaSaving(false);
    }
  };

  const handleUnlock = (e) => {
    e.preventDefault();
    if (passwordInput === MASTER_ADMIN_PASSWORD) {
      setEditUnlocked(true);
      setShowPasswordModal(false);
      setPasswordInput('');
      setPasswordError('');
      if (pendingAction) {
        pendingAction();
        setPendingAction(null);
      }
    } else {
      setPasswordError('Şifrə yanlışdır');
    }
  };

  const requireEditUnlock = (action) => {
    if (editUnlocked) {
      action();
      return;
    }
    setPendingAction(() => action);
    setShowPasswordModal(true);
    setPasswordInput('');
    setPasswordError('');
  };

  const formatTime = (value) => {
    if (!value) return '—';
    return new Date(value).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' });
  };

  const renderEmployeeAccordion = (employees, emptyMessage = 'Məlumat yoxdur', { allowDelete = false } = {}) => {
    if (!employees?.length) {
      return <p className="text-sm text-gray-500 py-4 text-center">{emptyMessage}</p>;
    }
    return (
      <div className="space-y-2">
        {employees.map((emp) => (
          <details
            key={emp.employeeId}
            className="group border border-violet-100 rounded-xl overflow-hidden bg-white shadow-sm"
          >
            <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden px-4 py-3 flex items-center justify-between gap-3 hover:bg-violet-50/80 transition select-none">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                  <i className="bi bi-person-fill text-violet-600"></i>
                </div>
                <div className="min-w-0 text-left">
                  <div className="font-semibold text-gray-800 truncate">{emp.employeeName}</div>
                  <div className="text-xs text-gray-500">{emp.days?.length || 0} gün · cəmi {formatMoney(emp.total || 0)}</div>
                </div>
              </div>
              <i className="bi bi-chevron-down text-violet-400 text-sm shrink-0 transition-transform group-open:rotate-180"></i>
            </summary>
            <div className="border-t border-violet-100 bg-violet-50/40">
              <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-violet-600/80 flex items-center justify-between gap-2">
                <span>Götürdüyü günlər</span>
                {allowDelete && !editUnlocked && (
                  <span className="normal-case font-normal text-gray-400">Silmək üçün redaktə kilidini açın</span>
                )}
              </div>
              {(emp.days?.length || 0) > 0 ? (
                <ul className="divide-y divide-violet-100/80 max-h-48 overflow-y-auto">
                  {emp.days.map((day, idx) => (
                    <li key={day.withdrawalId || `${day.date}-${idx}`} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm bg-white/60">
                      <span className="text-gray-600 min-w-0">
                        {formatDate(day.date)}
                        {day.withdrawnAt && (
                          <span className="text-gray-400 ml-2 text-xs">{formatTime(day.withdrawnAt)}</span>
                        )}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-semibold text-violet-700">-{formatMoney(day.amount || 0)}</span>
                        {allowDelete && editUnlocked && day.withdrawalId && (
                          <button
                            type="button"
                            onClick={() =>
                              setWithdrawalToDelete({
                                id: day.withdrawalId,
                                employeeName: emp.employeeName,
                                date: day.date,
                                amount: day.amount,
                              })
                            }
                            disabled={deletingWithdrawal}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition disabled:opacity-50"
                            title="Maaş çıxışını sil (pul kassaya qaytarılacaq)"
                          >
                            <i className="bi bi-trash text-sm"></i>
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 px-4 pb-3">Götürmə yoxdur.</p>
              )}
            </div>
          </details>
        ))}
      </div>
    );
  };

  const openEditUnlockModal = () => {
    setPendingAction(null);
    setShowPasswordModal(true);
    setPasswordInput('');
    setPasswordError('');
  };

  return (
    <div className="max-w-6xl mx-auto p-4 relative">
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm bg-gray-900 text-white rounded-2xl shadow-xl p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-gray-800 rounded-full p-2">
                <i className="bi bi-shield-lock text-orange-400 text-xl"></i>
              </div>
              <div>
                <div className="text-lg font-semibold">Redaktə / silmə</div>
                <div className="text-xs text-gray-400">Bu əməliyyat üçün şifrə daxil edin</div>
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
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPendingAction(null);
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
                  Təsdiq et
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {withdrawalToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 border border-violet-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-50 rounded-full p-2">
                <i className="bi bi-trash text-red-500 text-xl"></i>
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-800">Maaş çıxışını sil</div>
                <div className="text-xs text-gray-500">Səhv götürməni ləğv et</div>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">
              <span className="font-semibold text-gray-800">{withdrawalToDelete.employeeName}</span>
              {' · '}
              {formatDate(withdrawalToDelete.date)}
            </p>
            <p className="text-sm text-gray-600 mb-4">
              <span className="font-bold text-violet-800">{formatMoney(withdrawalToDelete.amount || 0)}</span>
              {' '}kassaya qaytarılacaq və işçi həmin günü yenidən götürə biləcək.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setWithdrawalToDelete(null)}
                disabled={deletingWithdrawal}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-700 disabled:opacity-50"
              >
                Ləğv et
              </button>
              <button
                type="button"
                onClick={handleDeleteEmployeeWithdrawal}
                disabled={deletingWithdrawal}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deletingWithdrawal ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Silinir...
                  </>
                ) : (
                  'Sil'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow-sm rounded-2xl p-5 border mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Günlük Xərclər</h1>
            <p className="text-sm text-gray-500 mt-1">
              Gəlir, bütün xərclər (məhsul, işçi maaşı, kassadan çəkilmə) və kassa balansı.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
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
            {isMaster && (
              editUnlocked ? (
                <span className="px-3 py-2 rounded-lg bg-green-100 text-green-800 text-xs font-semibold flex items-center gap-2">
                  <i className="bi bi-shield-check"></i>
                  Redaktə aktiv
                </span>
              ) : (
                <button
                  type="button"
                  onClick={openEditUnlockModal}
                  className="px-3 py-2 rounded-lg bg-gray-900 text-white text-xs font-semibold flex items-center gap-2 hover:bg-black"
                >
                  <i className="bi bi-key"></i>
                  Redaktə / silmə
                </button>
              )
            )}
          </div>
        </div>
        {notification && (
          <div className="mt-3 px-4 py-2 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800 flex items-center gap-2">
            <i className="bi bi-info-circle"></i>
            <span>{notification}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-600">Seçilmiş gün</span>
              <span className="text-xs text-gray-400">{selectedDate}</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Gəlir</span>
                <span className="text-lg font-bold text-green-700">{formatMoney(dayIncome)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Məhsul xərci</span>
                <span className={`text-lg font-bold ${dayExpense < 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {formatSignedMoney(dayExpense, formatMoney)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">İşçi maaşı</span>
                <span className={`text-lg font-bold ${dayPayrollOut < 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {formatSignedMoney(dayPayrollOut, formatMoney)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Kassadan çəkilmə</span>
                <span className={`text-lg font-bold ${dayOwnerOut < 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {formatSignedMoney(dayOwnerOut, formatMoney)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t pt-2 mt-1">
                <span className="text-sm font-semibold text-gray-700">Günlük xalis qazanc</span>
                <span className={`text-xl font-extrabold ${dayNet >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {formatMoney(dayNet)}
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
                <span className="text-sm text-gray-600">Məhsul xərci</span>
                <span className={`text-lg font-bold ${rangeExpense < 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {formatSignedMoney(rangeExpense, formatMoney)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">İşçi maaşı</span>
                <span className={`text-lg font-bold ${rangePayrollOut < 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {formatSignedMoney(rangePayrollOut, formatMoney)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Kassadan çəkilmə</span>
                <span className={`text-lg font-bold ${rangeOwnerOut < 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {formatSignedMoney(rangeOwnerOut, formatMoney)}
                </span>
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
                <p className="text-[11px] text-gray-500 mb-4">
                  Xalis qazanc kassa ilə eyni məntiqdədir: gəlir − məhsul xərci − işçi maaşı − kassadan çəkilmələr.
                </p>
              </>
            )}

            <div className="pt-3 border-t border-amber-200/60 space-y-3">
              <p className="text-[10px] uppercase tracking-wider text-amber-700/80 font-medium mb-0.5">Kassadan çəkilib (ümumi)</p>
              <p className="text-lg font-bold text-amber-800">{formatMoney(totalWithdrawn)}</p>

              <p className="text-[10px] uppercase tracking-wider text-gray-600 font-medium mt-2 mb-1.5">
                Bu ay çəkilənlər ({selectedDate.slice(0, 7)})
              </p>
              {thisMonthWithdrawals.length === 0 ? (
                <p className="text-xs text-gray-500 py-1">Bu ay hələ çəkilmə yoxdur</p>
              ) : (
                <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                  {thisMonthWithdrawals.map((w, i) => {
                    const amount = Number(w.amount) || 0;
                    const isReversal = amount < 0 || w.type === 'reversal';
                    const isEmployee = w.source === 'employee';
                    return (
                    <li
                      key={w.withdrawalId ? `${w.withdrawalId}-${w.type || 'w'}` : i}
                      className={`flex items-center justify-between gap-2 py-2 px-2.5 rounded-lg text-sm group ${
                        isEmployee ? 'bg-violet-50/90 border border-violet-100' : 'bg-white/80'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium truncate ${isEmployee ? 'text-violet-900' : 'text-gray-800'}`}>
                          {w.label || (isEmployee ? 'İşçi pul götürdü' : 'Kassadan çəkilmə')}
                        </div>
                        <div className="text-xs text-gray-500">{w.date ? formatDate(w.date) : '—'}</div>
                      </div>
                      <span className={`font-semibold shrink-0 ${isReversal ? 'text-green-700' : 'text-amber-800'}`}>
                        {isReversal ? '+' : '-'}{formatMoney(Math.abs(amount))}
                      </span>
                      {isMaster && editUnlocked && !isEmployee && (
                        <button
                          type="button"
                          onClick={() => requireEditUnlock(() => handleDeleteWithdrawal(w))}
                          disabled={kassaSaving}
                          className="p-1 rounded text-red-500 hover:bg-red-100 transition disabled:opacity-50 shrink-0"
                          title="Çəkilməni sil (məbləğ kassaya qaytarılacaq)"
                        >
                          <i className="bi bi-trash text-sm"></i>
                        </button>
                      )}
                    </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="pt-3 border-t border-amber-200/60">
              <p className="text-[11px] text-gray-500">
                İşçi maaşları və digər çəkilmələr xalis qazancdan da çıxılır; detallar aşağıdakı bölmədədir.
              </p>
            </div>

            {isMaster && editUnlocked ? (
            <div className="pt-3 border-t border-amber-200/60 space-y-3 mt-3">
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
                onClick={() => requireEditUnlock(handleSaveKassa)}
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

              <div className="space-y-3">
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
                  onClick={() => requireEditUnlock(handleWithdrawFromKassa)}
                  disabled={kassaSaving || !withdrawalInput.trim()}
                  className="w-full px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <i className="bi bi-bank"></i>
                  Çək və yadda saxla
                </button>
              </div>
            </div>
            ) : null}
          </div>
        </div>

        {/* Aylıq xərclər siyahısı - yalnız məhsul/material */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm mb-6">
          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-gray-800">
                {expenseRange === 'day' ? 'Günlük' : expenseRange === 'week' ? 'Həftəlik' : 'Aylıq'} məhsul xərcləri
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

        {/* İşçi maaşları — 10–10 dövr, hər işçi ayrı, arxiv */}
        <div className="bg-white border border-violet-200 rounded-2xl p-5 shadow-sm mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-violet-100">
                  <i className="bi bi-person-badge text-violet-700 text-lg"></i>
                </div>
                <h3 className="text-base font-bold text-gray-800">İşçi maaşları</h3>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Hesablama: hər ayın <strong>10-u – 10-u</strong>. Ayın 10-u keçəndə əvvəlki dövr avtomatik arxivlənir.
                Kassadan çıxır, günlük məhsul xərclərinə daxil deyil.
              </p>
            </div>
            {payrollReport?.currentPeriod && (
              <div className="flex flex-wrap gap-3 text-sm">
                <div className="px-3 py-2 rounded-lg bg-violet-50 border border-violet-100">
                  <span className="text-gray-600 block text-xs">Seçilmiş gün</span>
                  <span className="font-bold text-violet-800">{formatMoney(payrollReport.today?.total || 0)}</span>
                </div>
                <div className="px-3 py-2 rounded-lg bg-violet-100 border border-violet-200">
                  <span className="text-gray-600 block text-xs">Cari dövr cəmi</span>
                  <span className="font-bold text-violet-900">{formatMoney(payrollReport.currentPeriod.totalAmount || 0)}</span>
                </div>
              </div>
            )}
          </div>

          {!payrollReport ? (
            <p className="text-sm text-gray-500 py-4">Maaş məlumatı yüklənir...</p>
          ) : (
            <>
              <div className="mb-4 p-4 rounded-xl bg-violet-50/50 border border-violet-100 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-violet-700 mb-1">Cari dövr (10–10)</div>
                  <div className="text-sm font-semibold text-gray-800">{payrollReport.currentPeriod.label}</div>
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-semibold text-violet-800">{payrollReport.currentPeriod.employees?.length || 0}</span> işçi
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4 bg-gray-100 rounded-xl p-1 w-fit">
                <button
                  type="button"
                  onClick={() => setPayrollFilter('period')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                    payrollFilter === 'period'
                      ? 'bg-white text-violet-800 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Cari dövr ({payrollReport.currentPeriod.employees?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setPayrollFilter('today')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                    payrollFilter === 'today'
                      ? 'bg-white text-violet-800 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Bu gün — {formatDate(payrollReport.today?.date || selectedDate)} ({payrollReport.today?.employees?.length || 0})
                </button>
              </div>

              {renderEmployeeAccordion(
                payrollFilter === 'today'
                  ? payrollReport.today?.employees
                  : payrollReport.currentPeriod?.employees,
                payrollFilter === 'today'
                  ? 'Bu gün heç bir işçi maaş götürməyib.'
                  : 'Bu dövrdə hələ maaş çıxışı yoxdur.',
                { allowDelete: isMaster }
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 mb-3 mt-8 pt-6 border-t border-violet-100">
                <h4 className="text-sm font-semibold text-gray-700">Arxiv (bağlanmış 10–10 dövrlər)</h4>
                <button
                  type="button"
                  onClick={() => setShowArchive((prev) => !prev)}
                  disabled={(payrollReport.archives?.length || 0) === 0}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${
                    showArchive
                      ? 'bg-violet-600 text-white hover:bg-violet-500'
                      : 'bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100'
                  }`}
                >
                  <i className={`bi ${showArchive ? 'bi-eye-slash' : 'bi-archive'}`}></i>
                  {(payrollReport.archives?.length || 0) === 0
                    ? 'Arxiv yoxdur'
                    : showArchive
                      ? 'Arxivi bağla'
                      : `Arxivi göstər (${payrollReport.archives.length})`}
                </button>
              </div>

              {showArchive && (payrollReport.archives?.length || 0) > 0 && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="text-sm font-semibold text-gray-600">Aya görə arxiv seçimi:</label>
                    <select
                      value={selectedArchiveKey}
                      onChange={(e) => setSelectedArchiveKey(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 min-w-[220px]"
                    >
                      <option value="">Hamısı</option>
                      {payrollReport.archives.map((archive) => (
                        <option key={archive.periodKey} value={archive.periodKey}>
                          {archive.label}
                        </option>
                      ))}
                    </select>
                    {selectedArchiveKey && (
                      <button
                        type="button"
                        onClick={() => setSelectedArchiveKey('')}
                        className="text-sm text-violet-600 hover:text-violet-800 font-semibold"
                      >
                        Filtri təmizlə
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {payrollReport.archives
                      .filter((archive) => !selectedArchiveKey || archive.periodKey === selectedArchiveKey)
                      .map((archive) => (
                        <details
                          key={archive.periodKey}
                          open={Boolean(selectedArchiveKey)}
                          className="group border border-gray-200 rounded-xl overflow-hidden bg-gray-50/50"
                        >
                          <summary className="cursor-pointer px-4 py-3 flex flex-wrap items-center justify-between gap-2 hover:bg-gray-100/80">
                            <div>
                              <span className="text-xs font-semibold text-gray-500 uppercase">Arxiv</span>
                              <div className="font-semibold text-gray-800">{archive.label}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold text-violet-800">{formatMoney(archive.totalAmount || 0)}</div>
                              <div className="text-xs text-gray-500">{archive.employees?.length || 0} işçi</div>
                            </div>
                          </summary>
                          <div className="px-3 pb-3 pt-2 border-t border-gray-200 bg-white">
                            {renderEmployeeAccordion(
                              archive.employees,
                              'Bu dövrdə maaş çıxışı yoxdur.',
                              { allowDelete: isMaster }
                            )}
                          </div>
                        </details>
                      ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

      {/* Bu gün üçün xərc əlavə etmə və bu günün xərcləri */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border rounded-2xl p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Seçilmiş gün üçün məhsul xərci əlavə et</h2>
          <form onSubmit={handleAddExpense} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Məhsul / material adı</label>
              <input
                type="text"
                value={expenseName}
                onChange={e => setExpenseName(e.target.value)}
                placeholder="Məs: Un, ət, içki, təmizlik..."
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
            <h2 className="text-lg font-semibold text-gray-800">Seçilmiş günün məhsul xərcləri</h2>
            <span className="text-xs text-gray-500">
              Cəmi: {formatMoney(dayExpense)}
            </span>
          </div>
          {expensesDay.length === 0 ? (
            <div className="text-sm text-gray-500">Bu tarix üçün xərc daxil edilməyib.</div>
          ) : (
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold">Ad</th>
                    <th className="text-right px-3 py-2 font-semibold">Məbləğ</th>
                    {isMaster && (
                      <th className="text-center px-3 py-2 font-semibold">Əməliyyat</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {expensesDay.map((exp) => (
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
                      {isMaster && (
                        <td className="px-3 py-2 text-center">
                          {editUnlocked ? (
                            <button
                              type="button"
                              onClick={() => requireEditUnlock(() => handleDeleteExpense(exp._id))}
                              className="text-xs text-red-600 hover:text-red-800"
                            >
                              Sil
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => requireEditUnlock(() => handleDeleteExpense(exp._id))}
                              className="text-xs text-gray-500 hover:text-red-700"
                              title="Silmək üçün redaktə kilidini açın"
                            >
                              Kilidli
                            </button>
                          )}
                        </td>
                      )}
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

