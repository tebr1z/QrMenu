import React, { useState, useEffect } from 'react';
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API || '/api',
});

// Dummy menu data for UI
const menuItems = [
  { id: 1, name: 'Yemək 1', price: 5 },
  { id: 2, name: 'Yemək 2', price: 7 },
  { id: 3, name: 'Yemək 3', price: 10 },
];

const AdminTablePage = () => {
  const [tables, setTables] = useState([]);
  const [tableName, setTableName] = useState('');
  const [hourlyPrice, setHourlyPrice] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editHourlyPrice, setEditHourlyPrice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTables = async () => {
      setLoading(true);
      try {
        const res = await api.get('/table/GetTables');
        setTables(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        setError('Masalar yüklənmədi');
      } finally {
        setLoading(false);
      }
    };
    fetchTables();
  }, []);

  const handleAddTable = async () => {
    if (!tableName.trim() || !hourlyPrice) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/table/AddTable', {
        name: tableName,
        hourlyPrice: Number(hourlyPrice),
      });
      setTables(prev => [...prev, res.data.newTable]);
      setTableName('');
      setHourlyPrice('');
    } catch (err) {
      setError('Masa əlavə edilərkən xəta baş verdi');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    setLoading(true);
    setError('');
    try {
      await api.delete(`/table/DeleteTable/${id}`);
      setTables(tables.filter(table => (table.id || table._id) !== id));
    } catch (err) {
      setError('Masa silinərkən xəta baş verdi');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (table) => {
    setEditId(table.id || table._id);
    setEditName(table.name);
    setEditHourlyPrice(table.hourlyPrice);
  };

  const handleSaveEdit = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.put(`/table/UpdateTable/${editId}`, {
        name: editName,
        hourlyPrice: Number(editHourlyPrice),
      });
      setTables(tables.map(table =>
        (table.id || table._id) === editId ? res.data.table : table
      ));
      setEditId(null);
      setEditName('');
      setEditHourlyPrice('');
    } catch (err) {
      setError('Masa yenilənərkən xəta baş verdi');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditId(null);
    setEditName('');
    setEditHourlyPrice('');
  };

  // Defensive: always use array for tables
  const safeTables = Array.isArray(tables) ? tables : [];

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Masa əlavə et</h1>
      <div className="bg-white shadow-md rounded-lg p-6 flex flex-col md:flex-row items-center gap-4 mb-8">
        <input
          type="text"
          placeholder="Masa adı"
          value={tableName}
          onChange={e => setTableName(e.target.value)}
          className="border px-3 py-2 rounded w-full md:w-60 focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        <input
          type="number"
          placeholder="Saatlıq qiymət (₼)"
          value={hourlyPrice}
          onChange={e => setHourlyPrice(e.target.value)}
          className="border px-3 py-2 rounded w-full md:w-60 focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        <button
          onClick={handleAddTable}
          className="px-6 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 font-semibold transition"
          disabled={loading}
        >
          Masa əlavə et
        </button>
      </div>
      {error && <div className="text-red-500 mb-4">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {safeTables.map(table => (
          <div key={table.id || table._id} className="flex items-center bg-white shadow-md rounded-lg p-4 hover:shadow-lg transition border-l-4 border-orange-500">
            <div className="flex-1">
              {editId === (table.id || table._id) ? (
                <>
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="border px-2 py-1 rounded w-full mb-2"
                  />
                  <input
                    type="number"
                    value={editHourlyPrice}
                    onChange={e => setEditHourlyPrice(e.target.value)}
                    className="border px-2 py-1 rounded w-full mb-2"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleSaveEdit} className="px-4 py-1 bg-green-500 text-white rounded hover:bg-green-600" disabled={loading}>Yadda saxla</button>
                    <button onClick={handleCancelEdit} className="px-4 py-1 bg-gray-400 text-white rounded hover:bg-gray-500">Ləğv et</button>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-lg font-semibold text-gray-800 mb-1 flex items-center gap-2">
                    <i className="bi bi-table text-orange-500 text-xl"></i> {table.name}
                  </h2>
                  <div className="text-sm text-gray-600 mb-2">Saatlıq qiymət: <b>{table.hourlyPrice}₼</b></div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(table)} className="px-4 py-1 bg-orange-500 text-white rounded hover:bg-orange-600">Düzəliş</button>
                    <button onClick={() => handleDelete(table.id || table._id)} className="px-4 py-1 bg-red-500 text-white rounded hover:bg-red-600" disabled={loading}>Sil</button>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminTablePage; 