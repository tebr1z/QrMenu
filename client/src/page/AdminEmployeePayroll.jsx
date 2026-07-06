import React, { useContext, useEffect, useMemo, useState } from 'react';
import { createApiClient, createEmployeeApiClient, fetchAllSettled } from '../utils/http';
import { ContextUser } from '../context/CheckUserContext';
import { isMasterAdmin } from '../config/roles';
import { EMPLOYEE_SESSION_KEY } from '../config/employeePayroll';
import { toast } from 'react-toastify';
import Loading from '../components/Loading';

const apiClient = createApiClient();

const formatMoney = (v) => `${Number(v || 0).toFixed(2)}₼`;

function readEmployeeSession() {
  try {
    const raw = sessionStorage.getItem(EMPLOYEE_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function employeeApi(token) {
  return createEmployeeApiClient(token);
}

const EmployeeLogin = ({ onSuccess }) => {
  const [form, setForm] = useState({ name: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiClient.post('/employee/login', form);
      sessionStorage.setItem(EMPLOYEE_SESSION_KEY, JSON.stringify({
        token: res.data.token,
        employee: res.data.employee,
        today: res.data.today,
        period: res.data.period,
      }));
      onSuccess(res.data);
      toast.success(`Xoş gəldin, ${res.data.employee.name}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Giriş uğursuz oldu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-1">İşçi girişi</h2>
        <p className="text-sm text-gray-500 mb-6">İstifadəçi adınız və şifrənizlə daxil olun</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">İstifadəçi adı</label>
            <input
              type="text"
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Şifrə</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold disabled:opacity-50"
          >
            {loading ? 'Giriş...' : 'Daxil ol'}
          </button>
        </form>
      </div>
    </div>
  );
};

const EmployeeDashboard = ({ session, onLogout, onRefresh }) => {
  const [history, setHistory] = useState([]);
  const [withdrawing, setWithdrawing] = useState(false);
  const [status, setStatus] = useState(session);
  const [authToken, setAuthToken] = useState(session.token);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmKind, setConfirmKind] = useState('daily');

  const client = useMemo(() => employeeApi(authToken), [authToken]);

  const load = async () => {
    try {
      const settled = await fetchAllSettled([
        client.get('/employee/me/status'),
        client.get('/employee/me/history'),
      ]);
      const [statusRes, histRes] = settled;
      if (!statusRes.ok || !histRes.ok) {
        const errMsg = statusRes.error?.response?.data?.error
          || histRes.error?.response?.data?.error
          || 'Məlumat yenilənmədi';
        if (statusRes.error?.response?.status === 401 || histRes.error?.response?.status === 401) {
          toast.error('Sessiya bitib. Yenidən daxil olun.');
          onLogout();
          return;
        }
        toast.error(errMsg);
        return;
      }
      setAuthToken(session.token);
      setStatus({
        token: session.token,
        employee: statusRes.data.employee,
        today: statusRes.data.today,
        period: statusRes.data.period,
      });
      setHistory(Array.isArray(histRes.data) ? histRes.data : []);
      sessionStorage.setItem(EMPLOYEE_SESSION_KEY, JSON.stringify({
        token: session.token,
        employee: statusRes.data.employee,
        today: statusRes.data.today,
        period: statusRes.data.period,
      }));
    } catch {
      toast.error('Məlumat yenilənmədi');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleWithdraw = async (kind = 'daily') => {
    const payType = status.today?.payType || status.employee?.payType || 'daily';
    const daily = status.today?.daily;
    const premium = status.today?.premium;

    if (kind === 'premium') {
      if (premium?.withdrawn || !premium?.canWithdraw) return;
    } else if (daily?.withdrawn || !daily?.canWithdraw) {
      return;
    } else if (payType === 'monthly') {
      return;
    }

    setShowConfirm(false);
    setWithdrawing(true);
    try {
      const res = await client.post('/employee/me/withdraw', { kind });
      toast.success(res.data.message);
      await load();
      onRefresh?.();
    } catch (err) {
      const msg = err.response?.data?.error || 'Pul götürülə bilmədi';
      if (err.response?.status === 401) {
        toast.error('Sessiya bitib. Yenidən daxil olun.');
        onLogout();
      } else {
        toast.error(msg);
      }
    } finally {
      setWithdrawing(false);
    }
  };

  const openConfirm = (kind) => {
    setConfirmKind(kind);
    setShowConfirm(true);
  };

  const payType = status.today?.payType || status.employee?.payType || 'daily';
  const daily = status.today?.daily;
  const premium = status.today?.premium;
  const isPayDay = status.today?.isPayDay;

  const payTypeLabel = {
    daily: 'Günlük maaş',
    monthly: 'Aylıq maaş',
    daily_premium: 'Günlük + aylıq prim',
  }[payType] || 'Günlük maaş';

  const confirmAmount = confirmKind === 'premium'
    ? (premium?.remaining ?? premium?.monthlyAmount ?? 0)
    : (daily?.remaining ?? daily?.dailyAmount ?? 0);

  const confirmTitle = confirmKind === 'premium' ? 'Prim götür' : 'Maaşı götür';
  const confirmNote = confirmKind === 'premium'
    ? 'Aylıq prim kassadan çıxılacaq. Dövr ərzində bir dəfə götürülür.'
    : 'Məbləğ kassadan çıxılacaq. Bu əməliyyat gündə bir dəfə edilir.';

  return (
    <div className="max-w-lg mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{status.employee?.name}</h1>
          <p className="text-xs text-gray-400 mt-0.5">{payTypeLabel}</p>
        </div>
        <button type="button" onClick={onLogout} className="text-sm text-red-600 font-semibold">
          Çıxış
        </button>
      </div>

      {(payType === 'daily' || payType === 'daily_premium') && daily && (
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-amber-200 rounded-2xl p-6 mb-4 text-center">
          <p className="text-sm text-amber-800 font-medium mb-1">Bu gün götürülə bilən (günlük)</p>
          <p className="text-4xl font-extrabold text-amber-900">{formatMoney(daily.remaining)}</p>
          <p className="text-xs text-gray-500 mt-2">Günlük limit: {formatMoney(daily.dailyAmount)}</p>
          {daily.withdrawn ? (
            <p className="mt-3 text-sm text-green-700 font-semibold">
              Bu gün {formatMoney(daily.withdrawnAmount)} götürülüb
            </p>
          ) : (
            <button
              type="button"
              onClick={() => openConfirm('daily')}
              disabled={withdrawing || !daily.canWithdraw}
              className="mt-4 w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold disabled:opacity-50"
            >
              {withdrawing ? 'Gözləyin...' : 'Günlük maaşı götür'}
            </button>
          )}
        </div>
      )}

      {(payType === 'monthly' || payType === 'daily_premium') && premium && (
        <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-2xl p-6 mb-6 text-center">
          <p className="text-sm text-purple-800 font-medium mb-1">
            {payType === 'daily_premium' ? 'Aylıq prim' : 'Aylıq maaş'}
            {isPayDay ? ' (bu gün — ayın 10-u)' : ''}
          </p>
          <p className="text-4xl font-extrabold text-purple-900">
            {formatMoney(isPayDay && !premium.withdrawn ? premium.remaining : premium.monthlyAmount)}
          </p>
          {!isPayDay && !premium.withdrawn && (
            <p className="text-sm text-purple-700 mt-3 font-medium">
              Növbəti prim: {status.today?.nextPayDay || status.period?.start} (ayın 10-u)
            </p>
          )}
          {premium.withdrawn ? (
            <p className="mt-3 text-sm text-green-700 font-semibold">
              Bu dövr üçün {formatMoney(premium.withdrawnAmount)} götürülüb
            </p>
          ) : isPayDay ? (
            <button
              type="button"
              onClick={() => openConfirm('premium')}
              disabled={withdrawing || !premium.canWithdraw}
              className="mt-4 w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold disabled:opacity-50"
            >
              {withdrawing ? 'Gözləyin...' : payType === 'daily_premium' ? 'Prim götür' : 'Aylıq maaşı götür'}
            </button>
          ) : (
            <p className="mt-3 text-sm text-gray-500">
              {payType === 'daily_premium' ? 'Prim yalnız ayın 10-da götürülə bilər' : 'Aylıq maaş yalnız ayın 10-da götürülə bilər'}
            </p>
          )}
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-br from-orange-500 to-amber-500 p-5 text-center">
              <div className="mx-auto w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mb-3">
                <i className="bi bi-cash-coin text-white text-3xl"></i>
              </div>
              <h3 className="text-lg font-bold text-white">{confirmTitle}</h3>
            </div>
            <div className="p-6 text-center">
              <p className="text-gray-600 text-sm mb-2">Götürüləcək məbləğ:</p>
              <p className="text-3xl font-extrabold text-amber-900 mb-4">{formatMoney(confirmAmount)}</p>
              <p className="text-xs text-gray-500 mb-6">{confirmNote}</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  disabled={withdrawing}
                  className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition disabled:opacity-50"
                >
                  Ləğv et
                </button>
                <button
                  type="button"
                  onClick={() => handleWithdraw(confirmKind)}
                  disabled={withdrawing}
                  className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {withdrawing ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Gözləyin...
                    </>
                  ) : (
                    'Götür'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border rounded-xl p-4 mb-6">
        <h3 className="font-semibold text-gray-800 mb-2">Dövr (10 → 10)</h3>
        <p className="text-xs text-gray-500 mb-2">
          {status.period?.start} — {status.period?.end}
        </p>
        <p className="text-2xl font-bold text-emerald-700">{formatMoney(status.period?.total)}</p>
        <p className="text-xs text-gray-500 mt-1">Bu dövrdə götürülən ümumi məbləğ</p>
      </div>

      <div className="bg-white border rounded-xl p-4">
        <h3 className="font-semibold text-gray-800 mb-3">Son götürmələr</h3>
        {history.length === 0 ? (
          <p className="text-sm text-gray-500">Hələ qeyd yoxdur</p>
        ) : (
          <ul className="space-y-2 max-h-64 overflow-y-auto">
            {history.map((w) => (
              <li key={w._id} className="flex justify-between text-sm border-b pb-2">
                <span>{w.dateKey}</span>
                <span className="font-semibold text-amber-800">{formatMoney(w.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

const MasterAdminPanel = ({ apiClient }) => {
  const [data, setData] = useState({ employees: [], period: {} });
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', accessCode: '', password: '', payType: 'daily', dailyAmount: '', monthlyAmount: '' });
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const fetchAll = async () => {
    setLoading(true);
    try {
      const settled = await fetchAllSettled([
        apiClient.get('/employee'),
        apiClient.get('/employee/withdrawals/all'),
      ]);
      const [empRes, wRes] = settled;
      if (empRes.ok) setData(empRes.data);
      if (wRes.ok) setWithdrawals(wRes.data?.withdrawals || []);
      if (settled.some((r) => !r.ok)) {
        toast.warn('Bəzi məlumatlar qismən yüklənmədi');
      }
    } catch {
      toast.error('Məlumat yüklənmədi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/employee', {
        ...form,
        dailyAmount: Number(form.dailyAmount) || 0,
        monthlyAmount: Number(form.monthlyAmount) || 0,
      });
      toast.success('İşçi yaradıldı');
      setForm({ name: '', accessCode: '', password: '', payType: 'daily', dailyAmount: '', monthlyAmount: '' });
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Yaradılmadı');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editId) return;
    try {
      const payload = {
        name: editForm.name,
        accessCode: editForm.accessCode,
        payType: editForm.payType || 'daily',
        dailyAmount: Number(editForm.dailyAmount) || 0,
        monthlyAmount: Number(editForm.monthlyAmount) || 0,
        isActive: editForm.isActive,
      };
      if (editForm.password?.trim()) payload.password = editForm.password;
      await apiClient.put(`/employee/${editId}`, payload);
      toast.success('Yeniləndi');
      setEditId(null);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Yenilənmədi');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('İşçini silmək istəyirsiniz?')) return;
    try {
      await apiClient.delete(`/employee/${id}`);
      toast.success('Silindi');
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Silinmədi');
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">İşçi Maaş və Pul Götürmə</h1>
      <p className="text-sm text-gray-500 mb-6">
        Dövr: {data.period?.start} — {data.period?.end} (hər ayın 10-u → növbəti ayın 10-u)
      </p>

      <form onSubmit={handleCreate} className="bg-white border rounded-xl p-5 mb-8 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input
            placeholder="Ad"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="border rounded-lg px-3 py-2"
            required
          />
          <input
            placeholder="İşçi kodu"
            value={form.accessCode}
            onChange={(e) => setForm({ ...form, accessCode: e.target.value })}
            className="border rounded-lg px-3 py-2"
            required
          />
          <input
            type="password"
            placeholder="Şifrə"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="border rounded-lg px-3 py-2"
            required
          />
          <select
            value={form.payType}
            onChange={(e) => setForm({ ...form, payType: e.target.value })}
            className="border rounded-lg px-3 py-2"
          >
            <option value="daily">Günlük maaş</option>
            <option value="monthly">Yalnız aylıq (10-cu gün)</option>
            <option value="daily_premium">Günlük + aylıq prim (10-cu gün)</option>
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(form.payType === 'daily' || form.payType === 'daily_premium') && (
            <input
              type="number"
              placeholder="Günlük məbləğ (₼)"
              value={form.dailyAmount}
              onChange={(e) => setForm({ ...form, dailyAmount: e.target.value })}
              className="border rounded-lg px-3 py-2"
              min="0"
              step="0.01"
            />
          )}
          {(form.payType === 'monthly' || form.payType === 'daily_premium') && (
            <input
              type="number"
              placeholder={form.payType === 'daily_premium' ? 'Aylıq prim (₼)' : 'Aylıq məbləğ (₼)'}
              value={form.monthlyAmount}
              onChange={(e) => setForm({ ...form, monthlyAmount: e.target.value })}
              className="border rounded-lg px-3 py-2"
              min="0"
              step="0.01"
            />
          )}
          <button type="submit" className="bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600">
            İşçi əlavə et
          </button>
        </div>
      </form>

      <div className="bg-white border rounded-xl overflow-hidden mb-8">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left px-4 py-3">Ad</th>
              <th className="text-left px-4 py-3">Kod</th>
              <th className="text-left px-4 py-3">Növ</th>
              <th className="text-right px-4 py-3">Məbləğ</th>
              <th className="text-center px-4 py-3">Status</th>
              <th className="text-right px-4 py-3">Dövr cəmi (10→10)</th>
              <th className="text-center px-4 py-3">Əməliyyat</th>
            </tr>
          </thead>
          <tbody>
            {data.employees?.map((emp) => (
              <tr key={emp._id} className="border-t">
                {editId === emp._id ? (
                  <td colSpan={7} className="p-4">
                    <form onSubmit={handleUpdate} className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="border rounded px-2 py-1" />
                      <input value={editForm.accessCode} onChange={(e) => setEditForm({ ...editForm, accessCode: e.target.value })} className="border rounded px-2 py-1" />
                      <select value={editForm.payType || 'daily'} onChange={(e) => setEditForm({ ...editForm, payType: e.target.value })} className="border rounded px-2 py-1">
                        <option value="daily">Günlük</option>
                        <option value="monthly">Yalnız aylıq</option>
                        <option value="daily_premium">Günlük + prim</option>
                      </select>
                      {(editForm.payType === 'daily' || editForm.payType === 'daily_premium' || !editForm.payType) && (
                        <input type="number" placeholder="Günlük məbləğ" value={editForm.dailyAmount} onChange={(e) => setEditForm({ ...editForm, dailyAmount: e.target.value })} className="border rounded px-2 py-1" />
                      )}
                      {(editForm.payType === 'monthly' || editForm.payType === 'daily_premium') && (
                        <input type="number" placeholder={editForm.payType === 'daily_premium' ? 'Aylıq prim' : 'Aylıq məbləğ'} value={editForm.monthlyAmount} onChange={(e) => setEditForm({ ...editForm, monthlyAmount: e.target.value })} className="border rounded px-2 py-1" />
                      )}
                      <input type="password" placeholder="Yeni şifrə" value={editForm.password || ''} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} className="border rounded px-2 py-1" />
                      <label className="flex items-center gap-2 text-sm col-span-2">
                        <input type="checkbox" checked={editForm.isActive} onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })} />
                        Aktiv
                      </label>
                      <button type="submit" className="bg-green-600 text-white rounded px-3 py-1 text-sm">Saxla</button>
                      <button type="button" onClick={() => setEditId(null)} className="border rounded px-3 py-1 text-sm">Ləğv</button>
                    </form>
                  </td>
                ) : (
                  <>
                    <td className="px-4 py-3 font-medium">{emp.name}</td>
                    <td className="px-4 py-3">{emp.accessCode}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        emp.payType === 'monthly' ? 'bg-purple-100 text-purple-700'
                          : emp.payType === 'daily_premium' ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-blue-100 text-blue-700'
                      }`}>
                        {emp.payType === 'monthly' ? 'Aylıq' : emp.payType === 'daily_premium' ? 'Günlük+Prim' : 'Günlük'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs">
                      {emp.payType === 'daily_premium' ? (
                        <div>
                          <div>G: {formatMoney(emp.dailyAmount)}</div>
                          <div>P: {formatMoney(emp.monthlyAmount)}</div>
                        </div>
                      ) : (
                        formatMoney(emp.payType === 'monthly' ? emp.monthlyAmount : emp.dailyAmount)
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-bold ${emp.statusLabel !== 'Gözləyir' && !emp.statusLabel?.includes('gözlənilir') ? 'text-green-700' : 'text-amber-600'}`}>
                        {emp.statusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-700">{formatMoney(emp.periodTotal)}</td>
                    <td className="px-4 py-3 text-center space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditId(emp._id);
                          setEditForm({
                            name: emp.name,
                            accessCode: emp.accessCode,
                            payType: emp.payType || 'daily',
                            dailyAmount: emp.dailyAmount,
                            monthlyAmount: emp.monthlyAmount,
                            isActive: emp.isActive !== false,
                            password: '',
                          });
                        }}
                        className="text-blue-600 text-xs font-semibold"
                      >
                        Redaktə
                      </button>
                      <button type="button" onClick={() => handleDelete(emp._id)} className="text-red-600 text-xs font-semibold">
                        Sil
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="text-xl font-bold text-gray-800 mb-3">Bütün götürmələr (kassa + günlük xərcə düşür)</h2>
      <div className="bg-white border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left px-4 py-3">Tarix</th>
              <th className="text-left px-4 py-3">İşçi</th>
              <th className="text-left px-4 py-3">Növ</th>
              <th className="text-right px-4 py-3">Məbləğ</th>
              <th className="text-left px-4 py-3">Vaxt</th>
            </tr>
          </thead>
          <tbody>
            {withdrawals.map((w) => (
              <tr key={w._id} className="border-t">
                <td className="px-4 py-3">{w.dateKey}</td>
                <td className="px-4 py-3">{w.employeeName}</td>
                <td className="px-4 py-3 text-xs">
                  {w.kind === 'premium' ? 'Prim' : 'Günlük'}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-red-600">-{formatMoney(w.amount)}</td>
                <td className="px-4 py-3 text-gray-500">
                  {w.withdrawnAt ? new Date(w.withdrawnAt).toLocaleString('az-AZ') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const AdminEmployeePayroll = () => {
  const { apiClient, userRole } = useContext(ContextUser);
  const isMaster = isMasterAdmin(userRole);
  const [employeeSession, setEmployeeSession] = useState(() => readEmployeeSession());

  const handleEmployeeLogout = () => {
    sessionStorage.removeItem(EMPLOYEE_SESSION_KEY);
    setEmployeeSession(null);
  };

  if (isMaster) {
    return <MasterAdminPanel apiClient={apiClient} />;
  }

  if (employeeSession?.token) {
    return (
      <EmployeeDashboard
        session={employeeSession}
        onLogout={handleEmployeeLogout}
        onRefresh={() => setEmployeeSession(readEmployeeSession())}
      />
    );
  }

  return (
    <EmployeeLogin
      onSuccess={(data) => {
        setEmployeeSession({
          token: data.token,
          employee: data.employee,
          today: data.today,
          period: data.period,
        });
      }}
    />
  );
};

export default AdminEmployeePayroll;
