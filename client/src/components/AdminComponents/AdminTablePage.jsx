import React, { useState, useEffect } from 'react';
import { createApiClient } from '../../utils/http';

const apiClient = createApiClient();

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
  const [ps3Price, setPs3Price] = useState('');
  const [ps4Price, setPs4Price] = useState('');
  const [ps5Price, setPs5Price] = useState('');
  const [defaultPS, setDefaultPS] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editHourlyPrice, setEditHourlyPrice] = useState('');
  const [editPs3Price, setEditPs3Price] = useState('');
  const [editPs4Price, setEditPs4Price] = useState('');
  const [editPs5Price, setEditPs5Price] = useState('');
  const [editDefaultPS, setEditDefaultPS] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTables = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get('/table/GetTables');
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
      const res = await apiClient.post('/table/AddTable', {
        name: tableName,
        hourlyPrice: Number(hourlyPrice),
        ps3Price: ps3Price ? Number(ps3Price) : 0,
        ps4Price: ps4Price ? Number(ps4Price) : 0,
        ps5Price: ps5Price ? Number(ps5Price) : 0,
        defaultPS: defaultPS || null,
      });
      setTables(prev => [...prev, res.data.newTable]);
      setTableName('');
      setHourlyPrice('');
      setPs3Price('');
      setPs4Price('');
      setPs5Price('');
      setDefaultPS('');
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
      await apiClient.delete(`/table/DeleteTable/${id}`);
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
    setEditPs3Price(table.ps3Price || '');
    setEditPs4Price(table.ps4Price || '');
    setEditPs5Price(table.ps5Price || '');
    setEditDefaultPS(table.defaultPS || '');
  };

  const handleSaveEdit = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.put(`/table/UpdateTable/${editId}`, {
        name: editName,
        hourlyPrice: Number(editHourlyPrice),
        ps3Price: editPs3Price ? Number(editPs3Price) : 0,
        ps4Price: editPs4Price ? Number(editPs4Price) : 0,
        ps5Price: editPs5Price ? Number(editPs5Price) : 0,
        defaultPS: editDefaultPS || null,
      });
      setTables(tables.map(table =>
        (table.id || table._id) === editId ? res.data.table : table
      ));
      setEditId(null);
      setEditName('');
      setEditHourlyPrice('');
      setEditPs3Price('');
      setEditPs4Price('');
      setEditPs5Price('');
      setEditDefaultPS('');
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
    setEditPs3Price('');
    setEditPs4Price('');
    setEditPs5Price('');
    setEditDefaultPS('');
  };

  // Defensive: always use array for tables
  const safeTables = Array.isArray(tables) ? tables : [];

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Masa əlavə et</h1>
      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <input
            type="text"
            placeholder="Masa adı"
            value={tableName}
            onChange={e => setTableName(e.target.value)}
            className="border px-3 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <input
            type="number"
            placeholder="Saatlıq qiymət (₼)"
            value={hourlyPrice}
            onChange={e => setHourlyPrice(e.target.value)}
            className="border px-3 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <button
            onClick={handleAddTable}
            className="px-6 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 font-semibold transition"
            disabled={loading}
          >
            Masa əlavə et
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">PS3 Qiyməti (₼)</label>
            <input
              type="number"
              placeholder="PS3 saatlıq qiymət"
              value={ps3Price}
              onChange={e => setPs3Price(e.target.value)}
              className="border px-3 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">PS4 Qiyməti (₼)</label>
            <input
              type="number"
              placeholder="PS4 saatlıq qiymət"
              value={ps4Price}
              onChange={e => setPs4Price(e.target.value)}
              className="border px-3 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">PS5 Qiyməti (₼)</label>
            <input
              type="number"
              placeholder="PS5 saatlıq qiymət"
              value={ps5Price}
              onChange={e => setPs5Price(e.target.value)}
              className="border px-3 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Default PS Növü:</label>
          <select
            value={defaultPS}
            onChange={e => setDefaultPS(e.target.value)}
            className="border px-3 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            <option value="">Default PS seçilməyib</option>
            {ps3Price > 0 && <option value="PS3">PS3</option>}
            {ps4Price > 0 && <option value="PS4">PS4</option>}
            {ps5Price > 0 && <option value="PS5">PS5</option>}
          </select>
          <div className="text-xs text-gray-500 mt-1">Session başladılanda bu PS növü avtomatik seçiləcək</div>
        </div>
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
                    placeholder="Masa adı"
                    className="border px-2 py-1 rounded w-full mb-2"
                  />
                  <input
                    type="number"
                    value={editHourlyPrice}
                    onChange={e => setEditHourlyPrice(e.target.value)}
                    placeholder="Saatlıq qiymət (₼)"
                    className="border px-2 py-1 rounded w-full mb-2"
                  />
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <input
                      type="number"
                      value={editPs3Price}
                      onChange={e => setEditPs3Price(e.target.value)}
                      placeholder="PS3 (₼)"
                      className="border px-2 py-1 rounded text-sm"
                    />
                    <input
                      type="number"
                      value={editPs4Price}
                      onChange={e => setEditPs4Price(e.target.value)}
                      placeholder="PS4 (₼)"
                      className="border px-2 py-1 rounded text-sm"
                    />
                    <input
                      type="number"
                      value={editPs5Price}
                      onChange={e => setEditPs5Price(e.target.value)}
                      placeholder="PS5 (₼)"
                      className="border px-2 py-1 rounded text-sm"
                    />
                  </div>
                  <div className="mb-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Default PS:</label>
                    <select
                      value={editDefaultPS}
                      onChange={e => setEditDefaultPS(e.target.value)}
                      className="border px-2 py-1 rounded w-full text-sm"
                    >
                      <option value="">Default PS seçilməyib</option>
                      {editPs3Price > 0 && <option value="PS3">PS3</option>}
                      {editPs4Price > 0 && <option value="PS4">PS4</option>}
                      {editPs5Price > 0 && <option value="PS5">PS5</option>}
                    </select>
                  </div>
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
                  <div className="text-sm text-gray-600 mb-1">Saatlıq qiymət: <b>{table.hourlyPrice}₼</b></div>
                  {(table.ps3Price || table.ps4Price || table.ps5Price) && (
                    <div className="text-xs text-gray-500 mb-2">
                      {table.ps3Price > 0 && <span className="mr-2">PS3: {table.ps3Price}₼</span>}
                      {table.ps4Price > 0 && <span className="mr-2">PS4: {table.ps4Price}₼</span>}
                      {table.ps5Price > 0 && <span>PS5: {table.ps5Price}₼</span>}
                    </div>
                  )}
                  {table.defaultPS && (
                    <div className="text-xs text-blue-600 font-semibold mb-2">
                      Default PS: <b>{table.defaultPS}</b>
                    </div>
                  )}
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