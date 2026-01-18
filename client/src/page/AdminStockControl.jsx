import React, { useState, useEffect, useContext } from 'react';
import { ContextUser } from '../context/CheckUserContext';
import Loading from '../components/Loading';
import { toast } from 'react-toastify';

const AdminStockControl = () => {
  const { apiClient } = useContext(ContextUser);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'low', 'out'
  const [editingProduct, setEditingProduct] = useState(null);
  const [editStockQuantity, setEditStockQuantity] = useState('');
  const [editPurchasePrice, setEditPurchasePrice] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/Product/GetProduct');
      setProducts(response.data);
    } catch (error) {
      console.error('Məhsulları gətirərkən xəta:', error);
      toast.error('Məhsullar gətirilərkən xəta baş verdi');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredProducts = () => {
    switch (filter) {
      case 'low':
        return products.filter(p => p.stockQuantity > 0 && p.stockQuantity <= 10);
      case 'out':
        return products.filter(p => p.stockQuantity === 0);
      default:
        return products;
    }
  };

  const getStockStatus = (quantity) => {
    if (quantity === 0) return { text: 'Stokda yoxdur', color: 'text-red-600 bg-red-50' };
    if (quantity <= 10) return { text: 'Az stok', color: 'text-orange-600 bg-orange-50' };
    return { text: 'Stokda var', color: 'text-green-600 bg-green-50' };
  };

  const handleEditStock = (product) => {
    setEditingProduct(product._id);
    setEditStockQuantity(product.stockQuantity || 0);
    setEditPurchasePrice(product.purchasePrice || 0);
  };

  const handleSaveStock = async (productId) => {
    try {
      await apiClient.put(`/stock/UpdateStock/${productId}`, {
        stockQuantity: parseInt(editStockQuantity) || 0,
        purchasePrice: parseFloat(editPurchasePrice) || 0
      });
      
      toast.success('Stok məlumatları yeniləndi');
      setEditingProduct(null);
      fetchProducts();
    } catch (error) {
      console.error('Stok yenilənərkən xəta:', error);
      toast.error('Stok yenilənərkən xəta baş verdi');
    }
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
    setEditStockQuantity('');
    setEditPurchasePrice('');
  };

  if (loading) {
    return <Loading />;
  }

  const filteredProducts = getFilteredProducts();

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Stok Kontrol</h1>

      {/* Filter Buttons */}
      <div className="mb-6 flex flex-wrap gap-3">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'all'
              ? 'bg-orange-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Hamısı ({products.length})
        </button>
        <button
          onClick={() => setFilter('low')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'low'
              ? 'bg-orange-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Az stok ({products.filter(p => p.stockQuantity > 0 && p.stockQuantity <= 10).length})
        </button>
        <button
          onClick={() => setFilter('out')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'out'
              ? 'bg-orange-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Stokda yoxdur ({products.filter(p => p.stockQuantity === 0).length})
        </button>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <i className="bi bi-inbox text-6xl text-gray-300 mb-4"></i>
          <p className="text-gray-500 text-lg">Məhsul tapılmadı</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Məhsul
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stok Miqdarı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Alınma Qiyməti
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    1 Ədədin Qiyməti
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Satış Qiyməti
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Əməliyyat
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product) => {
                  const status = getStockStatus(product.stockQuantity);
                  return (
                    <tr key={product._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {product.image && (
                            <img
                              src={product.image}
                              alt={product.name}
                              className="h-10 w-10 rounded-lg object-cover mr-3"
                            />
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">{product.name}</div>
                            {product.category && (
                              <div className="text-sm text-gray-500">
                                {product.category.name || product.category}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingProduct === product._id ? (
                          <input
                            type="number"
                            value={editStockQuantity}
                            onChange={(e) => setEditStockQuantity(e.target.value)}
                            min="0"
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        ) : (
                          <div className="text-sm text-gray-900 font-semibold">
                            {product.stockQuantity || 0} ədəd
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingProduct === product._id ? (
                          <input
                            type="number"
                            value={editPurchasePrice}
                            onChange={(e) => setEditPurchasePrice(e.target.value)}
                            step="0.01"
                            min="0"
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        ) : (
                          <div className="text-sm text-gray-900">
                            {product.purchasePrice ? `${product.purchasePrice.toFixed(2)}₼` : '-'}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-medium">
                          {product.unitCost ? `${product.unitCost.toFixed(2)}₼` : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-semibold">
                          {product.price}₼
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${status.color}`}>
                          {status.text}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingProduct === product._id ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSaveStock(product._id)}
                              className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                            >
                              <i className="bi bi-check"></i>
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                            >
                              <i className="bi bi-x"></i>
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEditStock(product)}
                            className="px-3 py-1 bg-orange-500 text-white rounded text-sm hover:bg-orange-600"
                          >
                            <i className="bi bi-pencil"></i> Redaktə
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStockControl;

