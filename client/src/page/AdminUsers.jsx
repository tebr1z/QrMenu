import React, { useState, useEffect, useContext } from 'react';
import { ContextUser } from '../context/CheckUserContext';
import Loading from '../components/Loading';
import { toast } from 'react-toastify';
import {
  PAGE_KEYS,
  PAGE_LABELS,
  ACTION_LABELS,
  emptyPermissions,
  normalizePermissions,
} from '../config/permissions';

const ASSIGNABLE_PAGES = PAGE_KEYS.filter((k) => !['Users', 'AuditLog', 'SalesReport'].includes(k));

const PermissionMatrix = ({ permissions, onChange, disabled }) => {
  const toggle = (page, action, checked) => {
    if (disabled) return;
    const next = { ...permissions, [page]: { ...permissions[page] } };
    next[page][action] = checked;
    if (action === 'edit' && checked) next[page].view = true;
    if (action === 'delete' && checked) {
      next[page].view = true;
      next[page].edit = true;
    }
    if (action === 'view' && !checked) {
      next[page].edit = false;
      next[page].delete = false;
    }
    if (action === 'edit' && !checked) next[page].delete = false;
    onChange(next);
  };

  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="w-full text-sm min-w-[520px]">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left px-3 py-2 font-semibold text-gray-700">Səhifə</th>
            {['view', 'edit', 'delete'].map((action) => (
              <th key={action} className="text-center px-2 py-2 font-semibold text-gray-600 w-24">
                {ACTION_LABELS[action]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ASSIGNABLE_PAGES.map((page) => (
            <tr key={page} className="border-t">
              <td className="px-3 py-2 text-gray-800">{PAGE_LABELS[page]}</td>
              {['view', 'edit', 'delete'].map((action) => (
                <td key={action} className="text-center px-2 py-2">
                  <input
                    type="checkbox"
                    checked={Boolean(permissions[page]?.[action])}
                    disabled={disabled}
                    onChange={(e) => toggle(page, action, e.target.checked)}
                    className="w-4 h-4 accent-orange-500 cursor-pointer disabled:cursor-not-allowed"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const AdminUsers = () => {
  const { apiClient } = useContext(ContextUser);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    permissions: emptyPermissions(),
  });
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [showCreateMatrix, setShowCreateMatrix] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/Auth/users');
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error('İstifadəçilər yüklənmədi');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      toast.error('Ad, e-poçt və şifrə doldurun');
      return;
    }
    setSaving(true);
    try {
      await apiClient.post('/Auth/users', {
        name: form.name.trim(),
        username: form.username.trim() || undefined,
        email: form.email.trim(),
        password: form.password,
        permissions: form.permissions,
      });
      toast.success('Hesab yaradıldı');
      setForm({ name: '', username: '', email: '', password: '', permissions: emptyPermissions() });
      setShowCreateMatrix(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Hesab yaradılmadı');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (user) => {
    setEditId(user._id);
    setEditForm({
      name: user.name || '',
      username: user.username || '',
      email: user.email || '',
      password: '',
      permissions: normalizePermissions(user.permissions),
      isMaster: user.role === 'master_admin',
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editId || !editForm) return;
    setSaving(true);
    try {
      const payload = {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
      };
      if (editForm.username.trim()) payload.username = editForm.username.trim();
      if (editForm.password.trim()) payload.password = editForm.password;
      if (!editForm.isMaster) payload.permissions = editForm.permissions;
      await apiClient.put(`/Auth/users/${editId}`, payload);
      toast.success('Hesab yeniləndi');
      setEditId(null);
      setEditForm(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Yenilənmədi');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu hesabı silmək istəyirsiniz?')) return;
    try {
      await apiClient.delete(`/Auth/users/${id}`);
      toast.success('Hesab silindi');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Silinmədi');
    }
  };

  const countPermissions = (perms) => {
    const p = normalizePermissions(perms);
    return ASSIGNABLE_PAGES.filter((page) => p[page]?.view).length;
  };

  if (loading) return <Loading />;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">İstifadəçi və icazələr</h1>
      <p className="text-sm text-gray-600 mb-6">
        Hər işçi üçün ayrı istifadəçi adı və şifrə. Hansı səhifəyə baxa, dəyişdirə və silə biləcəyini təyin edin.
      </p>

      <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 mb-8 shadow-sm space-y-4">
        <h2 className="font-semibold text-gray-800">Yeni işçi hesabı</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Ad Soyad"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none"
            required
          />
          <input
            type="text"
            placeholder="İstifadəçi adı"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            className="border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none"
          />
          <input
            type="email"
            placeholder="E-poçt"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none"
            required
          />
          <input
            type="password"
            placeholder="Şifrə"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none"
            required
          />
        </div>

        <button
          type="button"
          onClick={() => setShowCreateMatrix(!showCreateMatrix)}
          className="text-sm text-orange-600 font-semibold hover:underline"
        >
          {showCreateMatrix ? 'İcazələri gizlət' : 'Səhifə icazələrini təyin et'}
        </button>

        {showCreateMatrix && (
          <PermissionMatrix
            permissions={form.permissions}
            onChange={(permissions) => setForm({ ...form, permissions })}
          />
        )}

        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold disabled:opacity-50"
        >
          {saving ? 'Yaradılır...' : 'Hesab yarat'}
        </button>
      </form>

      <div className="space-y-4">
        {users.map((user) => (
          <div key={user._id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            {editId === user._id && editForm ? (
              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="border rounded-lg px-3 py-2"
                    required
                  />
                  <input
                    type="text"
                    placeholder="İstifadəçi adı"
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                    className="border rounded-lg px-3 py-2"
                    disabled={editForm.isMaster}
                  />
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="border rounded-lg px-3 py-2"
                    required
                  />
                  <input
                    type="password"
                    placeholder="Yeni şifrə (boş saxla)"
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    className="border rounded-lg px-3 py-2"
                  />
                </div>

                {editForm.isMaster ? (
                  <p className="text-sm text-orange-700 bg-orange-50 rounded-lg px-3 py-2">
                    Master Admin bütün səhifələrə tam giriş hüququna malikdir.
                  </p>
                ) : (
                  <PermissionMatrix
                    permissions={editForm.permissions}
                    onChange={(permissions) => setEditForm({ ...editForm, permissions })}
                  />
                )}

                <div className="flex gap-2">
                  <button type="submit" disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold">
                    Saxla
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditId(null); setEditForm(null); }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm"
                  >
                    Ləğv
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-gray-800">{user.name}</div>
                  {user.username && (
                    <div className="text-sm text-gray-600">@{user.username}</div>
                  )}
                  <div className="text-sm text-gray-500">{user.email}</div>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-bold bg-orange-100 text-orange-700">
                    {user.role === 'master_admin' ? 'Master Admin' : 'İşçi'}
                  </span>
                  {user.role !== 'master_admin' && (
                    <div className="text-xs text-gray-500 mt-1">
                      {countPermissions(user.permissions)} səhifəyə giriş icazəsi
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(user)}
                    className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-lg font-semibold"
                  >
                    Redaktə
                  </button>
                  {user.role !== 'master_admin' && (
                    <button
                      type="button"
                      onClick={() => handleDelete(user._id)}
                      className="px-3 py-1.5 text-sm bg-red-50 text-red-700 rounded-lg font-semibold"
                    >
                      Sil
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminUsers;
