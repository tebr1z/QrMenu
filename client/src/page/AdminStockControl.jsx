import React, { useState, useEffect, useContext, useMemo } from 'react';
import { ContextUser } from '../context/CheckUserContext';
import { isMasterAdmin } from '../config/roles';
import {
  isLowStock,
  calcAvailablePortions,
  getUnitCostLabel,
  formatPortionHint,
  calcMaxSetSales,
  formatStockByView,
  stockViewModeLabel,
  getDefaultStockViewMode,
  getStockEditValue,
  parseStockEditInput,
  getAvailableStockViewModes,
  hasGramConversion,
  getPackSizeGrams,
} from '../utils/stockUnits';
import Loading from '../components/Loading';
import { toast } from 'react-toastify';

const AdminStockControl = () => {
  const { apiClient, userRole } = useContext(ContextUser);
  const isMaster = isMasterAdmin(userRole);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'low', 'out'
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [editStockQuantity, setEditStockQuantity] = useState('');
  const [editPurchasePrice, setEditPurchasePrice] = useState('');
  const [editStockViewMode, setEditStockViewMode] = useState('piece');
  const [editPortionSize, setEditPortionSize] = useState('');
  const [productViewModes, setProductViewModes] = useState({});
  const [portionDrafts, setPortionDrafts] = useState({});
  const [savingPortionId, setSavingPortionId] = useState(null);
  const [collapsedCategories, setCollapsedCategories] = useState(new Set());
  const [togglingMenuId, setTogglingMenuId] = useState(null);

  const toggleCategory = (key) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const sets = useMemo(() => products.filter((p) => p.isSet), [products]);
  const productMap = useMemo(() => {
    const m = new Map();
    products.forEach((p) => m.set(String(p._id), p));
    return m;
  }, [products]);

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

  const handleToggleCustomerMenu = async (product) => {
    try {
      setTogglingMenuId(product._id);
      const response = await apiClient.patch(`/Product/ToggleCustomerMenu/${product._id}`);
      setProducts((prev) =>
        prev.map((p) =>
          p._id === product._id
            ? { ...p, showInCustomerMenu: response.data.showInCustomerMenu }
            : p
        )
      );
      toast.success(response.data?.message || 'Görünürlük yeniləndi');
    } catch (error) {
      console.error('Toggle menu visibility error:', error);
      toast.error(error.response?.data?.error || 'Görünürlük dəyişdirilərkən xəta baş verdi');
    } finally {
      setTogglingMenuId(null);
    }
  };

  // Azərbaycan hərfləri və alternativləri (düzgün yazılış + başqa rəqəmlə yazılan)
  const normalizeForSearch = (str) => {
    if (!str) return '';
    const s = str.toLowerCase().trim();
    const map = {
      ə: 'e', ö: 'o', ü: 'u', ı: 'i', ğ: 'g', ş: 's', ç: 'c',
      e: 'e', o: 'o', u: 'u', i: 'i', g: 'g', s: 's', c: 'c',
    };
    return s.split('').map(ch => map[ch] || ch).join('');
  };

  // Sorğunun mətndə (substring və ya yaxın uyğunluq) olub-olmadığını yoxla
  const matchesSearch = (text, query) => {
    const nText = normalizeForSearch(text);
    const nQuery = normalizeForSearch(query);
    if (nText.includes(nQuery) || nQuery.includes(nText)) return 2; // güclü uyğunluq
    // Subsequence: sorğunun hərfləri mətndə ardıcıl çıxır (səhv yazılsa belə yaxın nəticə)
    let j = 0;
    for (let i = 0; i < nText.length && j < nQuery.length; i++) {
      if (nText[i] === nQuery[j]) j++;
    }
    if (j >= Math.min(nQuery.length, nText.length) * 0.6) return 1; // yaxın uyğunluq
    return 0;
  };

  const isOutOfStock = (p) => {
    if (Number(p.portionSize) > 0) return calcAvailablePortions(p) <= 0;
    return (Number(p.stockQuantity) || 0) === 0;
  };

  const isLowStockFiltered = (p) => isLowStock(p) && !isOutOfStock(p);

  const getFilteredProducts = () => {
    let list;
    switch (filter) {
      case 'low':
        list = products.filter(isLowStockFiltered);
        break;
      case 'out':
        list = products.filter(isOutOfStock);
        break;
      default:
        list = products;
    }
    if (!searchQuery.trim()) return list;
    const q = searchQuery.trim();
    const scored = list.map(p => {
      const name = p.name || '';
      const categoryName = (p.category?.name || (typeof p.category === 'string' ? p.category : '') || '').toString();
      const nameScore = matchesSearch(name, q);
      const catScore = matchesSearch(categoryName, q);
      const score = Math.max(nameScore, catScore);
      return { product: p, score };
    });
    const filtered = scored.filter(({ score }) => score > 0);
    return filtered.sort((a, b) => b.score - a.score).map(({ product }) => product);
  };

  const getProductViewMode = (product) => {
    const id = String(product._id);
    const mode = productViewModes[id] ?? getDefaultStockViewMode(product);
    if (mode === 'kg') return 'g';
    return mode;
  };

  const setProductViewMode = (product, mode) => {
    const id = String(product._id);
    const available = getAvailableStockViewModes(product);
    if (!available.includes(mode)) return;
    setProductViewModes(prev => ({ ...prev, [id]: mode }));
  };

  const getStockStatus = (product) => {
    if (isOutOfStock(product)) {
      return { text: 'Stokda yoxdur', color: 'text-red-600 bg-red-50' };
    }
    if (isLowStock(product)) {
      return { text: 'Az stok', color: 'text-orange-600 bg-orange-50' };
    }
    return { text: 'Stokda var', color: 'text-green-600 bg-green-50' };
  };

  const handleEditStock = (product) => {
    const mode = getProductViewMode(product);
    setEditingProduct(product._id);
    setEditStockViewMode(mode);
    setEditStockQuantity(getStockEditValue(product, mode));
    setEditPurchasePrice(product.purchasePrice ?? 0);
    setEditPortionSize(product.portionSize > 0 ? String(product.portionSize) : '');
  };

  const handleSavePortionSize = async (product) => {
    const id = String(product._id);
    const draft = portionDrafts[id] ?? (product.portionSize > 0 ? String(product.portionSize) : '');
    const grams = parseFloat(draft) || 0;
    try {
      setSavingPortionId(id);
      await apiClient.put(`/stock/UpdateStock/${product._id}`, {
        stockQuantity: product.stockQuantity ?? 0,
        purchasePrice: product.purchasePrice ?? 0,
        stockUnit: product.stockUnit || 'piece',
        portionSize: grams,
        portionUnit: 'g',
      });
      toast.success(grams > 0 ? '1 ədəd = qr saxlanıldı' : 'Qr çevrilməsi silindi');
      setPortionDrafts(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      fetchProducts();
    } catch {
      toast.error('Saxlanmadı');
    } finally {
      setSavingPortionId(null);
    }
  };

  const handleSaveStock = async (productId) => {
    try {
      const product = products.find(p => p._id === productId);
      const parsed = parseStockEditInput(editStockQuantity, editStockViewMode, product);
      const portionGrams = parseFloat(editPortionSize) || 0;
      await apiClient.put(`/stock/UpdateStock/${productId}`, {
        stockQuantity: parsed.stockQuantity,
        stockUnit: parsed.stockUnit,
        purchasePrice: parseFloat(editPurchasePrice) || 0,
        portionSize: portionGrams,
        portionUnit: 'g',
      });
      
      toast.success('Stok məlumatları yeniləndi');
      setProductViewModes(prev => ({ ...prev, [String(productId)]: editStockViewMode }));
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
    setEditPortionSize('');
  };

  if (loading) {
    return <Loading />;
  }

  const filteredProducts = getFilteredProducts();

  const getProductsByCategory = () => {
    const groups = {};
    filteredProducts.forEach(p => {
      const cat = p.category;
      const key = cat?._id?.toString() ?? cat?.name ?? (typeof cat === 'string' ? cat : '');
      const label = cat?.name ?? (typeof cat === 'string' ? cat : 'Kateqoriyasız');
      const k = key || '__none__';
      if (!groups[k]) groups[k] = { label: label || 'Kateqoriyasız', products: [] };
      groups[k].products.push(p);
    });
    return Object.entries(groups).sort((a, b) => (a[1].label || '').localeCompare(b[1].label || ''));
  };

  const productsByCategory = getProductsByCategory();

  const StockViewButtons = ({ product, mode, onSelect }) => {
    const modes = [
      { id: 'piece', label: 'ədəd', icon: 'bi-box-seam' },
      { id: 'g', label: 'qr', icon: 'bi-speedometer2' },
    ];
    const available = getAvailableStockViewModes(product);
    const weightEnabled = hasGramConversion(product);

    if (available.length <= 1) {
      return (
        <span className="text-xs font-semibold text-gray-600 uppercase">
          {stockViewModeLabel(available[0] || 'piece')}
        </span>
      );
    }

    return (
      <div className="flex flex-col gap-1">
        <div className="flex gap-1">
          {modes.map((m) => {
            const enabled = available.includes(m.id);
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                disabled={!enabled}
                onClick={() => enabled && onSelect(m.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold border flex items-center gap-1 transition ${
                  active
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-orange-300 hover:bg-orange-50'
                }`}
              >
                <i className={`bi ${m.icon}`} />
                {m.label}
              </button>
            );
          })}
        </div>
        {!weightEnabled && (product.stockUnit || 'piece') === 'piece' && (
          <span className="text-[10px] text-gray-400">qr üçün 1 ədəd=qr yaz</span>
        )}
      </div>
    );
  };

  const renderProductRow = (product) => {
    const status = getStockStatus(product);
    const stockUnit = product.stockUnit || 'piece';
    const portionHint = formatPortionHint(product);
    const viewMode = editingProduct === product._id ? editStockViewMode : getProductViewMode(product);
    const displayText = formatStockByView(product, viewMode);
    const isPieceProduct = (stockUnit === 'piece');
    const pid = String(product._id);
    const portionDraft = portionDrafts[pid] ?? (product.portionSize > 0 ? String(product.portionSize) : '');
    const hasPortion = getPackSizeGrams(product) > 0;

    const applyViewMode = (nextMode) => {
      const tempProduct = editingProduct === product._id
        ? { ...product, ...parseStockEditInput(editStockQuantity, editStockViewMode, product) }
        : product;
      const available = getAvailableStockViewModes(tempProduct);
      if (!available.includes(nextMode)) {
        toast.info('Əvvəl "1 ədəd = qr" yazın');
        return;
      }
      if (editingProduct === product._id) {
        const parsed = parseStockEditInput(editStockQuantity, editStockViewMode, product);
        const merged = { ...product, ...parsed };
        setEditStockViewMode(nextMode);
        setEditStockQuantity(getStockEditValue(merged, nextMode));
      } else {
        setProductViewMode(product, nextMode);
      }
    };

    const isVisibleInMenu = product.showInCustomerMenu !== false;

    return (
      <tr key={product._id} className="hover:bg-gray-50">
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center">
            {product.image && (
              <img src={product.image} alt={product.name} className="h-10 w-10 rounded-lg object-cover mr-3" />
            )}
            <div>
              <div className="text-sm font-medium text-gray-900">{product.name}</div>
              {!isVisibleInMenu && (
                <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                  <i className="bi bi-eye-slash"></i>
                  Müştəri menyusunda gizli
                </div>
              )}
              {portionHint && hasPortion && (
                <div className="text-xs text-violet-600 mt-0.5">{portionHint}</div>
              )}
            </div>
          </div>
        </td>
        <td className="px-4 py-4 whitespace-nowrap">
          {viewMode === 'piece' && (editingProduct === product._id || isPieceProduct) ? (
            editingProduct === product._id ? (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={editPortionSize}
                  onChange={e => setEditPortionSize(e.target.value)}
                  placeholder="150"
                  className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                  title="1 ədəd / paket neçə qr"
                />
                <span className="text-xs text-gray-500">qr</span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={portionDraft}
                  onChange={e => setPortionDrafts(prev => ({ ...prev, [pid]: e.target.value }))}
                  placeholder="—"
                  className="w-16 px-2 py-1 border border-gray-200 rounded text-sm focus:border-orange-400"
                  title="1 ədəd = neçə qr"
                />
                <span className="text-xs text-gray-400">qr</span>
                {(portionDrafts[pid] !== undefined && portionDrafts[pid] !== String(product.portionSize || '')) && (
                  <button
                    type="button"
                    onClick={() => handleSavePortionSize(product)}
                    disabled={savingPortionId === pid}
                    className="p-1 text-green-600 hover:bg-green-50 rounded"
                    title="Saxla"
                  >
                    <i className={`bi ${savingPortionId === pid ? 'bi-hourglass-split' : 'bi-check-lg'}`} />
                  </button>
                )}
              </div>
            )
          ) : (
            <span className="text-xs text-gray-400">—</span>
          )}
        </td>
        <td className="px-4 py-4 whitespace-nowrap">
          <StockViewButtons
            product={
              editingProduct === product._id && editPortionSize
                ? { ...product, portionSize: parseFloat(editPortionSize) || 0, portionUnit: 'g' }
                : product
            }
            mode={viewMode}
            onSelect={applyViewMode}
          />
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          {editingProduct === product._id ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={editStockQuantity}
                onChange={e => setEditStockQuantity(e.target.value)}
                min="0"
                step={editStockViewMode === 'piece' ? '1' : '0.001'}
                className="w-28 px-2 py-1 border border-gray-300 rounded text-sm"
                placeholder={editStockViewMode === 'g' ? '5000' : '10'}
              />
              <span className="text-sm font-medium text-gray-600">{stockViewModeLabel(editStockViewMode)}</span>
            </div>
          ) : (
            <div className="text-sm text-gray-900 font-semibold">{displayText}</div>
          )}
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          {editingProduct === product._id ? (
            <input
              type="number"
              value={editPurchasePrice}
              onChange={e => setEditPurchasePrice(e.target.value)}
              step="0.01"
              min="0"
              className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
            />
          ) : (
            <div className="text-sm text-gray-900">{product.purchasePrice ? `${product.purchasePrice.toFixed(2)}₼` : '-'}</div>
          )}
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="text-sm text-gray-900 font-medium">{product.unitCost ? `${product.unitCost.toFixed(2)}₼` : '-'}</div>
          <div className="text-xs text-gray-500">{getUnitCostLabel(product)}</div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="text-sm text-gray-900 font-semibold">{product.price}₼</div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${status.color}`}>{status.text}</span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          {editingProduct === product._id ? (
            <div className="flex gap-2">
              <button onClick={() => handleSaveStock(product._id)} className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"><i className="bi bi-check"></i></button>
              <button onClick={handleCancelEdit} className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"><i className="bi bi-x"></i></button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleToggleCustomerMenu(product)}
                disabled={togglingMenuId === product._id}
                title={isVisibleInMenu ? 'Müştəri menyusundan gizlət' : 'Müştəri menyusunda göstər'}
                className={`px-2 py-1 rounded text-sm ${
                  isVisibleInMenu
                    ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    : 'bg-violet-100 text-violet-700 hover:bg-violet-200'
                } disabled:opacity-50`}
              >
                {togglingMenuId === product._id ? (
                  <i className="bi bi-hourglass-split animate-spin"></i>
                ) : (
                  <i className={`bi ${isVisibleInMenu ? 'bi-eye' : 'bi-eye-slash'}`}></i>
                )}
              </button>
              <button onClick={() => handleEditStock(product)} className="px-3 py-1 bg-orange-500 text-white rounded text-sm hover:bg-orange-600"><i className="bi bi-pencil"></i> Redaktə</button>
            </div>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Stok Kontrol</h1>

      <p className="text-sm text-gray-500 mb-6">
        Hər məhsulda ya <strong>ədəd</strong>, ya <strong>qr</strong> göstərilir — eyni anda hər ikisi yox.
        Ədəd rejimində <strong>1 ədəd = qr</strong> yazsanız, qr düyməsi aktiv olur.
      </p>

      {/* Axtarış */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg"></i>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Axtar... (ə/e, ö/o, ş/s və s. avtomatik; yaxın yazılış da nəzərə alınır)"
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Təmizlə"
            >
              <i className="bi bi-x-lg"></i>
            </button>
          )}
        </div>
      </div>

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
          Az stok ({products.filter(isLowStockFiltered).length})
        </button>
        <button
          onClick={() => setFilter('out')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'out'
              ? 'bg-orange-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Stokda yoxdur ({products.filter(isOutOfStock).length})
        </button>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <i className="bi bi-inbox text-6xl text-gray-300 mb-4"></i>
          <p className="text-gray-500 text-lg">Məhsul tapılmadı</p>
        </div>
      ) : (
        <div className="space-y-6">
          {productsByCategory.map(([key, { label, products: categoryProducts }]) => {
            const isCollapsed = collapsedCategories.has(key);
            return (
              <div key={key} className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
                <button
                  type="button"
                  onClick={() => toggleCategory(key)}
                  className="w-full px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2 text-left hover:bg-gray-100 transition"
                >
                  <i className={`bi ${isCollapsed ? 'bi-chevron-right' : 'bi-chevron-down'} text-orange-500 text-lg transition-transform`}></i>
                  <i className="bi bi-folder2 text-orange-500"></i>
                  <span className="text-lg font-semibold text-gray-800">{label}</span>
                  <span className="text-sm font-normal text-gray-500">({categoryProducts.length} məhsul)</span>
                </button>
                {!isCollapsed && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Məhsul</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">1 ədəd = qr</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Göstərim</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stok Miqdarı</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Alınma Qiyməti</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vahid Maya</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Satış Qiyməti</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Əməliyyat</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {categoryProducts.map(p => renderProductRow(p))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {sets.length > 0 && (
        <div className="mt-10 bg-gradient-to-br from-violet-50 to-blue-50 border border-violet-200 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-1 flex items-center gap-2">
            <i className="bi bi-collection text-violet-600" /> Set stok xülasəsi
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Set satışında anbardan qr/kq ilə avtomatik çıxış. Ətraflı: Set anbar səhifəsi.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sets.map((set) => {
              const max = calcMaxSetSales(set, productMap);
              return (
                <div key={set._id} className="bg-white rounded-xl border p-4 shadow-sm">
                  <div className="font-semibold text-gray-800 truncate">{set.name}</div>
                  <div className={`text-2xl font-extrabold mt-2 ${max === null ? 'text-gray-400' : max <= 0 ? 'text-red-600' : max <= 5 ? 'text-orange-600' : 'text-emerald-700'}`}>
                    {max === null ? '—' : `~${max}`}
                    {max !== null && <span className="text-sm font-medium text-gray-500 ml-1">set</span>}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{set.price}₼ · {(set.setItems || []).filter(i => i.section === 'internal').length} anbar qaydası</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminStockControl;

