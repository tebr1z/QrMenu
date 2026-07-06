import React, { useEffect, useMemo, useState } from 'react';
import { createApiClient, fetchAllSettled } from '../utils/http';

const apiClient = createApiClient();

const TableStatus = () => {
  const [tables, setTables] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const settled = await fetchAllSettled([
          apiClient.get('/table/GetTables'),
          apiClient.get('/tablesession/Active'),
        ]);
        const [tablesRes, sessionsRes] = settled;
        setTables(tablesRes.ok && Array.isArray(tablesRes.data) ? tablesRes.data : []);
        setSessions(sessionsRes.ok && Array.isArray(sessionsRes.data) ? sessionsRes.data : []);
      } catch (error) {
        setTables([]);
        setSessions([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);


  const activeTableIds = useMemo(() => {
    return new Set(sessions.map(session => session.tableId));
  }, [sessions]);

  const { occupiedTables, emptyTables } = useMemo(() => {
    const occupied = [];
    const empty = [];
    tables.forEach(table => {
      const id = table.id || table._id;
      if (activeTableIds.has(id)) {
        occupied.push(table);
      } else {
        empty.push(table);
      }
    });
    return { occupiedTables: occupied, emptyTables: empty };
  }, [tables, activeTableIds]);

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="bg-white border rounded-2xl shadow-sm p-5 mb-6">
        <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Masa vəziyyəti</h1>
        <p className="text-sm text-gray-500 mt-1">Yalnız dolu və boş masalar görünür.</p>
      </div>

      {loading && <div className="text-gray-500">Yüklənir...</div>}

      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border rounded-2xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-semibold text-gray-800">Dolu masalar</div>
              <span className="text-sm font-bold text-red-600 bg-red-50 px-3 py-1 rounded-full">
                {occupiedTables.length}
              </span>
            </div>
            {occupiedTables.length === 0 ? (
              <div className="text-gray-500">Dolu masa yoxdur.</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {occupiedTables.map(table => (
                  <div
                    key={table.id || table._id}
                    className="border border-red-200 bg-red-50 text-red-700 rounded-xl px-3 py-3 text-center font-semibold"
                  >
                    {table.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border rounded-2xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-semibold text-gray-800">Boş masalar</div>
              <span className="text-sm font-bold text-green-700 bg-green-50 px-3 py-1 rounded-full">
                {emptyTables.length}
              </span>
            </div>
            {emptyTables.length === 0 ? (
              <div className="text-gray-500">Boş masa yoxdur.</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {emptyTables.map(table => (
                  <div
                    key={table.id || table._id}
                    className="border border-green-200 bg-green-50 text-green-700 rounded-xl px-3 py-3 text-center font-semibold"
                  >
                    {table.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TableStatus;
