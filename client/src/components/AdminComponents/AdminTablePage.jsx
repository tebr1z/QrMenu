import React, { useState, useContext } from 'react';
import { ContextAdmin } from '../../context/AdminContext';

// Dummy menu data for UI
const menuItems = [
  { id: 1, name: 'Yemək 1', price: 5 },
  { id: 2, name: 'Yemək 2', price: 7 },
  { id: 3, name: 'Yemək 3', price: 10 },
];

const AdminTablePage = () => {
  const { tables, setTables } = useContext(ContextAdmin);
  const [tableName, setTableName] = useState('');
  const [hourlyPrice, setHourlyPrice] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editHourlyPrice, setEditHourlyPrice] = useState('');

  // Add new table
  const handleAddTable = () => {
    if (!tableName.trim() || !hourlyPrice) return;
    setTables([
      ...tables,
      {
        id: Date.now(),
        name: tableName,
        hourlyPrice: Number(hourlyPrice),
      },
    ]);
    setTableName('');
    setHourlyPrice('');
  };

  // Delete table
  const handleDelete = (id) => {
    setTables(tables.filter(table => table.id !== id));
  };

  // Start editing
  const handleEdit = (table) => {
    setEditId(table.id);
    setEditName(table.name);
    setEditHourlyPrice(table.hourlyPrice);
  };

  // Save edit
  const handleSaveEdit = () => {
    setTables(tables.map(table =>
      table.id === editId ? { ...table, name: editName, hourlyPrice: Number(editHourlyPrice) } : table
    ));
    setEditId(null);
    setEditName('');
    setEditHourlyPrice('');
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditId(null);
    setEditName('');
    setEditHourlyPrice('');
  };

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
        >
          Masa əlavə et
        </button>
      </div>
      {/* Table List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tables.map(table => (
          <div key={table.id} className="flex items-center bg-white shadow-md rounded-lg p-4 hover:shadow-lg transition border-l-4 border-orange-500">
            <div className="flex-1">
              {editId === table.id ? (
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
                    <button onClick={handleSaveEdit} className="px-4 py-1 bg-green-500 text-white rounded hover:bg-green-600">Yadda saxla</button>
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
                    <button onClick={() => handleDelete(table.id)} className="px-4 py-1 bg-red-500 text-white rounded hover:bg-red-600">Sil</button>
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