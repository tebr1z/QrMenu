import React, { useContext, useEffect, useMemo, useState } from 'react';
import { ContextUser } from '../context/CheckUserContext';
import { isMasterAdmin } from '../config/roles';
import { toast } from 'react-toastify';
import Loading from '../components/Loading';

const formatMoney = (value) => `${Number(value || 0).toFixed(2)}₼`;

const SORT_MODES = {
  REVENUE_DESC: 'revenue_desc',
  QUANTITY_DESC: 'quantity_desc',
  QUANTITY_ASC: 'quantity_asc',
  COST_DESC: 'cost_desc',
  COST_ASC: 'cost_asc',
  PROFIT_DESC: 'profit_desc',
  PROFIT_ASC: 'profit_asc',
};

function sortReportRows(rows, sortMode) {
  const sorted = [...rows];
  const byName = (a, b) => a.name.localeCompare(b.name, 'az');

  switch (sortMode) {
    case SORT_MODES.QUANTITY_DESC:
      return sorted.sort((a, b) => b.quantity - a.quantity || byName(a, b));
    case SORT_MODES.QUANTITY_ASC:
      return sorted.sort((a, b) => a.quantity - b.quantity || byName(a, b));
    case SORT_MODES.COST_DESC:
      return sorted.sort((a, b) => b.salesCost - a.salesCost || byName(a, b));
    case SORT_MODES.COST_ASC:
      return sorted.sort((a, b) => a.salesCost - b.salesCost || byName(a, b));
    case SORT_MODES.PROFIT_DESC:
      return sorted.sort((a, b) => b.profit - a.profit || byName(a, b));
    case SORT_MODES.PROFIT_ASC:
      return sorted.sort((a, b) => a.profit - b.profit || byName(a, b));
    default:
      return sorted.sort((a, b) => b.revenue - a.revenue || byName(a, b));
  }
}

function SortHeaderButton({ label, active, direction, onClick, align = 'center' }) {
  const alignClass = align === 'right' ? 'text-right ml-auto' : align === 'left' ? 'text-left' : 'text-center mx-auto';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 font-semibold transition-colors hover:text-orange-600 ${alignClass} ${
        active ? 'text-orange-600' : 'text-gray-600'
      }`}
    >
      <span>{label}</span>
      {active && (
        <i className={`bi bi-caret-${direction === 'asc' ? 'up' : 'down'}-fill text-xs`} />
      )}
    </button>
  );
}

const dedupeOrders = (inputOrders) => {
  const map = new Map();
  inputOrders.forEach((order) => {
    const key = `${order.tableId}_${order.startTime}_${order.endTime}`;
    if (!map.has(key)) map.set(key, order);
  });
  return Array.from(map.values());
};

const ReportTable = ({
  title,
  rows,
  canEditCost,
  costDrafts,
  setCostDrafts,
  savingId,
  onSaveCost,
  sortMode,
  onSortQuantity,
  onSortCost,
  onSortProfit,
}) => {
  const totals = rows.reduce(
    (acc, row) => ({
      quantity: acc.quantity + row.quantity,
      revenue: acc.revenue + row.revenue,
      totalCost: acc.totalCost + row.totalCost,
      profit: acc.profit + row.profit,
    }),
    { quantity: 0, revenue: 0, totalCost: 0, profit: 0 }
  );

  return (
    <div className="bg-white shadow-lg rounded-2xl overflow-hidden border mb-8">
      <div className="px-5 py-4 border-b bg-gray-50 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-gray-800">{title}</h2>
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="text-gray-600">Satış: <strong>{totals.quantity}</strong></span>
          <span className="text-green-700">Gəlir: <strong>{formatMoney(totals.revenue)}</strong></span>
          <span className="text-amber-700">Maya: <strong>{formatMoney(totals.totalCost)}</strong></span>
          <span className={totals.profit >= 0 ? 'text-emerald-700' : 'text-red-600'}>
            Mənfəət: <strong>{formatMoney(totals.profit)}</strong>
          </span>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="p-6 text-gray-500 text-center">Məhsul tapılmadı.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-gray-600">
              <tr>
                <th className="text-left font-semibold px-4 py-3">Ad</th>
                <th className="text-right font-semibold px-4 py-3">Qiymət</th>
                <th className="text-center font-semibold px-4 py-3">
                  <SortHeaderButton
                    label="Aylıq satış sayı"
                    active={sortMode === SORT_MODES.QUANTITY_DESC || sortMode === SORT_MODES.QUANTITY_ASC}
                    direction={sortMode === SORT_MODES.QUANTITY_ASC ? 'asc' : 'desc'}
                    onClick={onSortQuantity}
                  />
                </th>
                <th className="text-right font-semibold px-4 py-3">Aylıq gəlir</th>
                <th className="text-right font-semibold px-4 py-3">
                  <SortHeaderButton
                    label="Maya dəyəri (1 ədəd)"
                    align="right"
                    active={sortMode === SORT_MODES.COST_DESC || sortMode === SORT_MODES.COST_ASC}
                    direction={sortMode === SORT_MODES.COST_ASC ? 'asc' : 'desc'}
                    onClick={onSortCost}
                  />
                </th>
                <th className="text-right font-semibold px-4 py-3">Ümumi maya</th>
                <th className="text-right font-semibold px-4 py-3">
                  <SortHeaderButton
                    label="Mənfəət"
                    align="right"
                    active={sortMode === SORT_MODES.PROFIT_DESC || sortMode === SORT_MODES.PROFIT_ASC}
                    direction={sortMode === SORT_MODES.PROFIT_ASC ? 'asc' : 'desc'}
                    onClick={onSortProfit}
                  />
                </th>
                {canEditCost && <th className="text-center font-semibold px-4 py-3">Əməliyyat</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row._id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-3 font-medium text-gray-800">{row.name}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{formatMoney(row.price)}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{row.quantity}</td>
                  <td className="px-4 py-3 text-right font-semibold text-green-700">{formatMoney(row.revenue)}</td>
                  <td className="px-4 py-3 text-right">
                    {canEditCost ? (
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={costDrafts[row._id] ?? ''}
                        onChange={(e) => setCostDrafts((prev) => ({ ...prev, [row._id]: e.target.value }))}
                        className="w-24 border rounded px-2 py-1 text-right focus:outline-none focus:ring-2 focus:ring-orange-400"
                      />
                    ) : (
                      <span className="text-gray-700">{formatMoney(row.salesCost)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-amber-800">{formatMoney(row.totalCost)}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${row.profit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {formatMoney(row.profit)}
                  </td>
                  {canEditCost && (
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => onSaveCost(row._id)}
                        disabled={savingId === row._id}
                        className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold disabled:opacity-50"
                      >
                        {savingId === row._id ? '...' : 'Saxla'}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-bold">
                <td className="px-4 py-3 text-gray-700">Cəmi</td>
                <td className="px-4 py-3 text-right">—</td>
                <td className="px-4 py-3 text-center">{totals.quantity}</td>
                <td className="px-4 py-3 text-right text-green-700">{formatMoney(totals.revenue)}</td>
                <td className="px-4 py-3 text-right">—</td>
                <td className="px-4 py-3 text-right text-amber-800">{formatMoney(totals.totalCost)}</td>
                <td className={`px-4 py-3 text-right ${totals.profit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                  {formatMoney(totals.profit)}
                </td>
                {canEditCost && <td />}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};

const AdminSalesReport = () => {
  const { apiClient, userRole } = useContext(ContextUser);
  const canEditCost = isMasterAdmin(userRole);

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [costDrafts, setCostDrafts] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [sortMode, setSortMode] = useState(SORT_MODES.REVENUE_DESC);

  const toggleQuantitySort = () => {
    setSortMode((prev) =>
      prev === SORT_MODES.QUANTITY_DESC ? SORT_MODES.QUANTITY_ASC : SORT_MODES.QUANTITY_DESC
    );
  };

  const toggleCostSort = () => {
    setSortMode((prev) =>
      prev === SORT_MODES.COST_DESC ? SORT_MODES.COST_ASC : SORT_MODES.COST_DESC
    );
  };

  const toggleProfitSort = () => {
    setSortMode((prev) =>
      prev === SORT_MODES.PROFIT_DESC ? SORT_MODES.PROFIT_ASC : SORT_MODES.PROFIT_DESC
    );
  };

  const sortFilterBtn = (mode, label) => {
    const active = sortMode === mode;
    return (
      <button
        type="button"
        onClick={() => setSortMode(mode)}
        className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition ${
          active
            ? 'bg-orange-500 text-white border-orange-500'
            : 'bg-white text-gray-700 border-gray-300 hover:border-orange-400 hover:text-orange-600'
        }`}
      >
        {label}
      </button>
    );
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersRes, productsRes] = await Promise.all([
        apiClient.get('/order/GetOrders'),
        apiClient.get('/Product/GetProduct'),
      ]);
      setOrders(Array.isArray(ordersRes.data) ? ordersRes.data : []);
      const list = Array.isArray(productsRes.data) ? productsRes.data : [];
      setProducts(list);
      const drafts = {};
      list.forEach((p) => {
        drafts[p._id] = String(p.salesCost ?? 0);
      });
      setCostDrafts(drafts);
    } catch {
      toast.error('Satış hesabatı yüklənmədi');
      setOrders([]);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const monthOrders = useMemo(() => {
    if (!selectedMonth) return [];
    const [year, month] = selectedMonth.split('-').map(Number);
    const start = new Date(year, month - 1, 1).getTime();
    const end = new Date(year, month, 1).getTime();

    return dedupeOrders(orders).filter((order) => {
      const orderTime = order.endTime || order.createdAt || order.startTime;
      if (!orderTime) return false;
      const ms = new Date(orderTime).getTime();
      return ms >= start && ms < end;
    });
  }, [orders, selectedMonth]);

  const salesMap = useMemo(() => {
    const map = new Map();
    monthOrders.forEach((order) => {
      const menu = Array.isArray(order.selectedMenu) ? order.selectedMenu : [];
      menu.forEach((item) => {
        const id = String(item._id || item.id || '');
        if (!id) return;
        const quantity = item.quantity || 1;
        const price = item.price || 0;
        const current = map.get(id) || { quantity: 0, revenue: 0, name: item.name || '' };
        current.quantity += quantity;
        current.revenue += price * quantity;
        if (item.name) current.name = item.name;
        map.set(id, current);
      });
    });
    return map;
  }, [monthOrders]);

  const productRowsRaw = useMemo(() => {
    return products
      .filter((p) => !p.isSet)
      .map((product) => {
        const id = String(product._id);
        const sales = salesMap.get(id) || { quantity: 0, revenue: 0 };
        const draftCost = costDrafts[id];
        const salesCost = draftCost !== undefined && draftCost !== ''
          ? Number(draftCost) || 0
          : Number(product.salesCost) || 0;
        const totalCost = sales.quantity * salesCost;
        const profit = sales.revenue - totalCost;
        return { _id: id, name: product.name, price: Number(product.price) || 0, quantity: sales.quantity, revenue: sales.revenue, salesCost, totalCost, profit };
      });
  }, [products, salesMap, costDrafts]);

  const setRowsRaw = useMemo(() => {
    return products
      .filter((p) => p.isSet)
      .map((product) => {
        const id = String(product._id);
        const sales = salesMap.get(id) || { quantity: 0, revenue: 0 };
        const draftCost = costDrafts[id];
        const salesCost = draftCost !== undefined && draftCost !== ''
          ? Number(draftCost) || 0
          : Number(product.salesCost) || 0;
        const totalCost = sales.quantity * salesCost;
        const profit = sales.revenue - totalCost;
        return { _id: id, name: product.name, price: Number(product.price) || 0, quantity: sales.quantity, revenue: sales.revenue, salesCost, totalCost, profit };
      });
  }, [products, salesMap, costDrafts]);

  const productRows = useMemo(
    () => sortReportRows(productRowsRaw, sortMode),
    [productRowsRaw, sortMode]
  );

  const setRows = useMemo(
    () => sortReportRows(setRowsRaw, sortMode),
    [setRowsRaw, sortMode]
  );

  const grandTotals = useMemo(() => {
    const all = [...productRows, ...setRows];
    return all.reduce(
      (acc, row) => ({
        quantity: acc.quantity + row.quantity,
        revenue: acc.revenue + row.revenue,
        totalCost: acc.totalCost + row.totalCost,
        profit: acc.profit + row.profit,
      }),
      { quantity: 0, revenue: 0, totalCost: 0, profit: 0 }
    );
  }, [productRows, setRows]);

  const handleSaveCost = async (productId) => {
    const value = costDrafts[productId];
    setSavingId(productId);
    try {
      const res = await apiClient.patch(`/Product/${productId}/sales-cost`, {
        salesCost: Number(value) || 0,
      });
        const updated = res.data?.product?.salesCost ?? (Number(value) || 0);
      setProducts((prev) =>
        prev.map((p) => (String(p._id) === productId ? { ...p, salesCost: updated } : p))
      );
      setCostDrafts((prev) => ({ ...prev, [productId]: String(updated) }));
      toast.success('Maya dəyəri saxlanıldı');
    } catch {
      toast.error('Maya dəyəri saxlanılmadı');
    } finally {
      setSavingId(null);
    }
  };

  const monthLabel = useMemo(() => {
    if (!selectedMonth) return '';
    const [year, month] = selectedMonth.split('-').map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString('az-AZ', { month: 'long', year: 'numeric' });
  }, [selectedMonth]);

  if (loading) return <Loading />;

  return (
    <div className="max-w-7xl mx-auto p-4">
      <div className="bg-white shadow-sm rounded-2xl p-5 border mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Satış Hesabatı</h1>
            <p className="text-sm text-gray-500 mt-1">
              Məhsul və setlər üzrə aylıq satış, gəlir və mənfəət.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-gray-600">Ay seç:</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
            <div className="text-xs text-orange-700 font-semibold uppercase">Seçilmiş ay</div>
            <div className="text-lg font-bold text-gray-800 mt-1">{monthLabel}</div>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-xl p-4">
            <div className="text-xs text-green-700 font-semibold uppercase">Ümumi gəlir</div>
            <div className="text-2xl font-bold text-green-800 mt-1">{formatMoney(grandTotals.revenue)}</div>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
            <div className="text-xs text-amber-700 font-semibold uppercase">Ümumi maya</div>
            <div className="text-2xl font-bold text-amber-800 mt-1">{formatMoney(grandTotals.totalCost)}</div>
          </div>
          <div className={`border rounded-xl p-4 ${grandTotals.profit >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
            <div className={`text-xs font-semibold uppercase ${grandTotals.profit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>Ümumi mənfəət</div>
            <div className={`text-2xl font-bold mt-1 ${grandTotals.profit >= 0 ? 'text-emerald-800' : 'text-red-700'}`}>
              {formatMoney(grandTotals.profit)}
            </div>
          </div>
        </div>

        {canEditCost && (
          <p className="text-xs text-gray-500 mt-4">
            Maya dəyərini yalnız Master Admin dəyişə bilər. Mənfəət = aylıq gəlir − (satış sayı × maya dəyəri).
          </p>
        )}

        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="text-sm font-semibold text-gray-600 mb-2">Sırala:</div>
          <div className="flex flex-wrap gap-2">
            {sortFilterBtn(SORT_MODES.QUANTITY_DESC, 'Çox satılan')}
            {sortFilterBtn(SORT_MODES.QUANTITY_ASC, 'Az satılan')}
            {sortFilterBtn(SORT_MODES.COST_DESC, 'Maya (yüksək)')}
            {sortFilterBtn(SORT_MODES.COST_ASC, 'Maya (aşağı)')}
            {sortFilterBtn(SORT_MODES.PROFIT_DESC, 'Ən çox mənfəət')}
            {sortFilterBtn(SORT_MODES.PROFIT_ASC, 'Ən az mənfəət')}
            {sortFilterBtn(SORT_MODES.REVENUE_DESC, 'Gəlir üzrə')}
          </div>
        </div>
      </div>

      <ReportTable
        title="Məhsullar"
        rows={productRows}
        canEditCost={canEditCost}
        costDrafts={costDrafts}
        setCostDrafts={setCostDrafts}
        savingId={savingId}
        onSaveCost={handleSaveCost}
        sortMode={sortMode}
        onSortQuantity={toggleQuantitySort}
        onSortCost={toggleCostSort}
        onSortProfit={toggleProfitSort}
      />

      <ReportTable
        title="Setlər"
        rows={setRows}
        canEditCost={canEditCost}
        costDrafts={costDrafts}
        setCostDrafts={setCostDrafts}
        savingId={savingId}
        onSaveCost={handleSaveCost}
        sortMode={sortMode}
        onSortQuantity={toggleQuantitySort}
        onSortCost={toggleCostSort}
        onSortProfit={toggleProfitSort}
      />
    </div>
  );
};

export default AdminSalesReport;
