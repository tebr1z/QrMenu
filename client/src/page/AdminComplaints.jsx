import React, { useState, useEffect, useContext } from 'react';
import { ContextUser } from '../context/CheckUserContext';
import Loading from '../components/Loading';
import {
  COMPLAINT_ADMIN_VIEW_CODE,
  COMPLAINT_VIEW_UNLOCK_KEY,
} from '../config/complaint';

const COMPLAINTS_LAST_SEEN_KEY = 'complaintsLastSeenAt';

const AdminComplaints = () => {
  const { apiClient } = useContext(ContextUser);
  const [unlocked, setUnlocked] = useState(
    () => sessionStorage.getItem(COMPLAINT_VIEW_UNLOCK_KEY) === '1'
  );
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState('');
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (unlocked) {
      fetchComplaints();
      localStorage.setItem(COMPLAINTS_LAST_SEEN_KEY, new Date().toISOString());
    }
  }, [unlocked]);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/complaint');
      setComplaints(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Şikayətlər gətirilərkən xəta:', err);
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSubmit = (e) => {
    e.preventDefault();
    if (codeInput.trim() === COMPLAINT_ADMIN_VIEW_CODE) {
      sessionStorage.setItem(COMPLAINT_VIEW_UNLOCK_KEY, '1');
      setUnlocked(true);
      setCodeError('');
      setCodeInput('');
    } else {
      setCodeError('Kod yanlışdır');
    }
  };

  const handleLock = () => {
    sessionStorage.removeItem(COMPLAINT_VIEW_UNLOCK_KEY);
    setUnlocked(false);
    setComplaints([]);
    setCodeInput('');
    setCodeError('');
  };

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleString('az-AZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const markAsRead = async (id) => {
    const idStr = String(id);
    try {
      await apiClient.put(`/complaint/${idStr}/read`);
      setComplaints((prev) =>
        prev.map((c) =>
          String(c._id) === idStr ? { ...c, isRead: true } : c
        )
      );
      window.dispatchEvent(new CustomEvent('complaints-updated'));
    } catch (err) {
      console.error('Oxunmuş kimi işarələnərkən xəta:', err);
    }
  };

  if (!unlocked) {
    return (
      <div className="max-w-sm mx-auto p-4 sm:p-6 mt-8 sm:mt-16">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-rose-100 flex items-center justify-center">
              <i className="bi bi-lock-fill text-2xl text-rose-600"></i>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Şikayət qutusu</h1>
            <p className="text-sm text-gray-500 mt-2">Şikayətlərə baxmaq üçün kodu daxil edin</p>
          </div>
          <form onSubmit={handleCodeSubmit} className="space-y-4">
            <div>
              <label htmlFor="complaint-admin-code" className="block text-sm font-semibold text-gray-700 mb-1">
                Kod
              </label>
              <input
                id="complaint-admin-code"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={codeInput}
                onChange={(e) => {
                  setCodeInput(e.target.value);
                  setCodeError('');
                }}
                placeholder="••••"
                className="w-full px-4 py-3 text-base text-center tracking-widest border border-gray-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
              />
              {codeError && (
                <p className="text-sm text-red-600 mt-2 text-center">{codeError}</p>
              )}
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700 transition min-h-[48px]"
            >
              Daxil ol
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loading) return <Loading />;

  const unreadCount = complaints.filter((c) => c.isRead !== true).length;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-1">Şikayət qutusu</h1>
          <p className="text-sm sm:text-base text-gray-600">
            Müştəri şikayətləri
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
                {unreadCount} yeni
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={handleLock}
          className="px-3 py-2 text-sm font-semibold rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition flex items-center gap-1.5"
        >
          <i className="bi bi-lock"></i>
          Kilidlə
        </button>
      </div>

      {complaints.length === 0 ? (
        <div className="bg-gray-50 rounded-2xl p-8 text-center text-gray-500">
          <i className="bi bi-inbox text-4xl mb-2 block"></i>
          <p>Hələ şikayət yoxdur</p>
        </div>
      ) : (
        <div className="space-y-4">
          {complaints.map((c) => (
            <div
              key={c._id}
              className={`bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition relative ${
                c.isRead === true ? 'border-gray-200' : 'border-rose-300 ring-1 ring-rose-100'
              }`}
            >
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-xs text-gray-500">{formatDate(c.createdAt)}</span>
                {c.isRead !== true && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500 text-white uppercase">
                    Yeni
                  </span>
                )}
              </div>
              <p className="text-sm sm:text-base text-gray-800 whitespace-pre-wrap break-words leading-relaxed">
                {c.message}
              </p>

              {c.isRead !== true && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => markAsRead(c._id)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
                  >
                    Oxundu
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminComplaints;
export { COMPLAINTS_LAST_SEEN_KEY };
