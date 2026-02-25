import React, { useState, useEffect, useContext } from 'react';
import { ContextUser } from '../context/CheckUserContext';
import Loading from '../components/Loading';

const AdminSetRequests = () => {
  const { apiClient } = useContext(ContextUser);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editPhone, setEditPhone] = useState('');
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  useEffect(() => {
    fetchRequests();
    localStorage.setItem('setRequestsLastSeenAt', new Date().toISOString());
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/setrequest');
      setRequests(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Set sorğuları gətirilərkən xəta:', err);
      setRequests([]);
    } finally {
      setLoading(false);
    }
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

  const startEdit = (r) => {
    setEditingId(r._id);
    setEditPhone(r.phone || '');
    setEditName(r.customerName || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditPhone('');
    setEditName('');
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      const res = await apiClient.put(`/setrequest/${editingId}`, {
        phone: editPhone,
        customerName: editName,
      });
      setRequests((prev) =>
        prev.map((r) => (r._id === editingId ? { ...r, ...res.data } : r))
      );
      cancelEdit();
    } catch (err) {
      console.error('Yenilənərkən xəta:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (deleteConfirmId !== id) {
      setDeleteConfirmId(id);
      return;
    }
    setDeletingId(id);
    try {
      await apiClient.delete(`/setrequest/${id}`);
      setRequests((prev) => prev.filter((r) => r._id !== id));
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Silinərkən xəta:', err);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Öz set sorğuları</h1>
      <p className="text-gray-600 mb-6">
        Müştərilər &quot;Öz setini özün yarat&quot; ilə göndərdiyi sorğular. Əlaqə nömrəsini və adı burada əlavə edə və redaktə edə bilərsiniz.
      </p>

      {requests.length === 0 ? (
        <div className="bg-gray-50 rounded-2xl p-8 text-center text-gray-500">
          <i className="bi bi-inbox text-4xl mb-2"></i>
          <p>Hələ set sorğusu yoxdur</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((r) => (
            <div
              key={r._id}
              className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition relative"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-500 mb-0.5">
                    {formatDate(r.createdAt)}
                  </div>
                  {editingId === r._id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Ad"
                        className="w-full max-w-xs px-3 py-1.5 border rounded-lg text-sm"
                      />
                      <input
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="Əlaqə nömrəsi"
                        className="w-full max-w-xs px-3 py-1.5 border rounded-lg text-sm"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={saveEdit}
                          disabled={saving}
                          className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                        >
                          Yadda saxla
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300"
                        >
                          Ləğv et
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="font-semibold text-gray-800">
                        {r.customerName || '—'}
                      </p>
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <i className="bi bi-telephone"></i>
                        {r.phone || 'Əlaqə nömrəsi yoxdur'}
                      </p>
                      <button
                        type="button"
                        onClick={() => startEdit(r)}
                        className="mt-1 text-sm text-violet-600 hover:text-violet-700 font-medium"
                      >
                        Əlaqə nömrəsi / ad əlavə et və ya redaktə et
                      </button>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDelete(r._id)}
                    disabled={deletingId === r._id}
                    className={`p-2 rounded-lg transition ${
                      deleteConfirmId === r._id
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'text-red-500 hover:bg-red-50'
                    } disabled:opacity-50`}
                    title={deleteConfirmId === r._id ? 'Təsdiqlə: sil' : 'Sorğunu sil'}
                  >
                    <i className="bi bi-trash"></i>
                  </button>
                  {deleteConfirmId === r._id && (
                    <span className="text-xs text-red-600 font-medium">Təkrar basın: silinəcək</span>
                  )}
                </div>
              </div>
              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  İstədiyi set
                </p>
                <p className="text-gray-800 whitespace-pre-wrap">{r.setDescription}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminSetRequests;
