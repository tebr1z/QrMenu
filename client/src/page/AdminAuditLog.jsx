import React, { useContext, useEffect, useState } from 'react';
import { ContextUser } from '../context/CheckUserContext';
import Loading from '../components/Loading';

const TYPE_LABELS = {
  open_table: 'Masa açdı',
  add_product: 'Məhsul vurdu',
  remove_product: 'Məhsul silindi',
  payment: 'Ödəniş',
  employee_withdraw: 'İşçi maaş',
  employee_premium: 'İşçi prim',
  employee_reversal: 'Maaş silindi',
};

const RESOURCE_TYPE_LABELS = {
  EmployeePayroll: 'İşçi maaş',
  Order: 'Ödəniş',
  TableManage: 'Masa',
};

const TYPE_BADGE_CLASS = {
  employee_withdraw: 'bg-amber-100 text-amber-800',
  employee_premium: 'bg-purple-100 text-purple-800',
  employee_reversal: 'bg-green-100 text-green-800',
  payment: 'bg-blue-100 text-blue-800',
};

const AdminAuditLog = () => {
  const { apiClient } = useContext(ContextUser);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiClient.get('/audit?limit=500&mode=activity');
        setLogs(Array.isArray(res.data) ? res.data : []);
      } catch {
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [apiClient]);

  const filtered = logs.filter((log) => {
    if (!filter.trim()) return true;
    const q = filter.toLowerCase();
    return (
      log.userName?.toLowerCase().includes(q) ||
      log.summary?.toLowerCase().includes(q) ||
      log.details?.employeeName?.toLowerCase().includes(q) ||
      log.details?.tableName?.toLowerCase().includes(q) ||
      log.details?.productName?.toLowerCase().includes(q)
    );
  });

  if (loading) return <Loading />;

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Fəaliyyət jurnalı</h1>
      <p className="text-sm text-gray-500 mb-6">
        Masaların idarəsi, ödənişlər və işçi maaş/prim götürmələri (günlük xərclərə daxil deyil).
      </p>

      <input
        type="text"
        placeholder="İstifadəçi, işçi, masa və ya məhsul axtar..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="w-full max-w-md border rounded-lg px-3 py-2 mb-6 focus:ring-2 focus:ring-orange-500 outline-none"
      />

      <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto max-h-[75vh]">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="text-left px-4 py-3 font-semibold w-44">Vaxt</th>
                <th className="text-left px-4 py-3 font-semibold w-40">Kim</th>
                <th className="text-left px-4 py-3 font-semibold w-32">Növ</th>
                <th className="text-left px-4 py-3 font-semibold">Nə etdi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">Qeyd tapılmadı</td>
                </tr>
              ) : (
                filtered.map((log) => {
                  const detailType = log.details?.type;
                  const typeLabel = TYPE_LABELS[detailType]
                    || RESOURCE_TYPE_LABELS[log.resource]
                    || 'Fəaliyyət';
                  const badgeClass = TYPE_BADGE_CLASS[detailType]
                    || (log.resource === 'EmployeePayroll' ? 'bg-violet-100 text-violet-800' : 'bg-blue-100 text-blue-800');

                  return (
                  <tr key={log._id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap align-top">
                      {log.createdAt ? new Date(log.createdAt).toLocaleString('az-AZ') : '—'}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium text-gray-800">{log.userName}</div>
                      {log.userEmail && (
                        <div className="text-xs text-gray-500">{log.userEmail}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${badgeClass}`}>
                        {typeLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-800 align-top">{log.summary}</td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminAuditLog;
