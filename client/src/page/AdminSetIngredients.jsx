import React, { useContext, useEffect, useMemo, useState } from 'react';
import { ContextUser } from '../context/CheckUserContext';
import Loading from '../components/Loading';
import {
  formatWarehouseStock,
  calcSetItemDeduction,
  calcMaxSetSalesFromItem,
  calcMaxSetSales,
} from '../utils/stockUnits';

function SetStockBadge({ count }) {
  if (count === null || count === undefined) {
    return <span className="text-xs text-gray-400">Anbar qaydası yoxdur</span>;
  }
  if (count <= 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
        <i className="bi bi-x-circle" /> Satış yoxdur
      </span>
    );
  }
  if (count <= 5) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800">
        <i className="bi bi-exclamation-triangle" /> ~{count} set qalır
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
      <i className="bi bi-check-circle" /> ~{count} set satıla bilər
    </span>
  );
}

const AdminSetIngredients = () => {
  const { apiClient } = useContext(ContextUser);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiClient.get('/Product/GetProduct');
        setProducts(Array.isArray(res.data) ? res.data : []);
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [apiClient]);

  const productMap = useMemo(() => {
    const m = new Map();
    products.forEach((p) => m.set(String(p._id), p));
    return m;
  }, [products]);

  const sets = useMemo(() => products.filter((p) => p.isSet), [products]);

  const resolveName = (id) => productMap.get(String(id))?.name || '—';

  if (loading) return <Loading />;

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Set anbar kontrolu</h1>
      <p className="text-sm text-gray-600 mb-6">
        Hər set satışında anbardan nə qədər çıxdığını və qalan stoku görün.
        Məs: cips 100 qr/set — anbarda <strong>9 paket + açıq 50 qr</strong> qalıb.
      </p>

      {sets.length === 0 ? (
        <p className="text-gray-500 bg-white border rounded-xl p-6 text-center">Set məhsul tapılmadı.</p>
      ) : (
        <div className="space-y-4">
          {sets.map((set) => {
            const qrItems = (set.setItems || []).filter((i) => (i.section || 'qr') === 'qr');
            const internalItems = (set.setItems || []).filter((i) => i.section === 'internal');
            const isOpen = expandedId === set._id;
            const maxSets = calcMaxSetSales(set, productMap);

            return (
              <div key={set._id} className="bg-white border rounded-xl shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedId(isOpen ? null : set._id)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 text-left gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-800 text-lg">{set.name}</div>
                    <div className="text-sm text-gray-500 mt-0.5">
                      {set.price}₼ · QR: {qrItems.length} · Anbar: {internalItems.length}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <SetStockBadge count={maxSets} />
                    <i className={`bi ${isOpen ? 'bi-chevron-up' : 'bi-chevron-down'} text-gray-400`} />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 border-t space-y-5 pt-4">
                    {maxSets !== null && (
                      <div className={`p-4 rounded-xl border ${
                        maxSets <= 0 ? 'bg-red-50 border-red-200' : maxSets <= 5 ? 'bg-orange-50 border-orange-200' : 'bg-emerald-50 border-emerald-200'
                      }`}>
                        <div className="text-xs font-semibold uppercase text-gray-600 mb-1">Təxmini set sayı</div>
                        <div className="text-3xl font-extrabold text-gray-900">
                          {maxSets <= 0 ? '0' : `~${maxSets}`}
                          <span className="text-base font-medium text-gray-600 ml-2">set</span>
                        </div>
                      </div>
                    )}

                    {qrItems.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-orange-700 mb-2 text-sm">QR hissə (menyu)</h3>
                        <ul className="space-y-1">
                          {qrItems.map((item, idx) => (
                            <li key={idx} className="text-sm text-gray-700">
                              {resolveName(item.productId)} · {item.quantity || 1} ədəd
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {internalItems.length === 0 ? (
                      <p className="text-sm text-gray-500">Anbar qaydası əlavə edilməyib</p>
                    ) : (
                      <div className="space-y-3">
                        <h3 className="font-semibold text-blue-700 text-sm">Anbar hissəsi</h3>
                        {internalItems.map((item, idx) => {
                          const linked = productMap.get(String(item.linkedProductId || item.productId));
                          const deduct = calcSetItemDeduction(item, linked);
                          const maxItem = calcMaxSetSalesFromItem(item, linked);
                          const wh = linked ? formatWarehouseStock(linked) : null;

                          return (
                            <div key={idx} className="border rounded-xl p-4 bg-blue-50/40 border-blue-100">
                              <div className="font-semibold text-gray-800 mb-2">
                                {resolveName(item.productId)}
                              </div>
                              <div className="grid sm:grid-cols-3 gap-3 text-sm">
                                <div className="bg-white rounded-lg p-3 border">
                                  <div className="text-xs text-gray-500 mb-1">1 set çıxış</div>
                                  <div className="font-bold text-blue-800">{deduct.label}</div>
                                </div>
                                <div className="bg-white rounded-lg p-3 border">
                                  <div className="text-xs text-gray-500 mb-1">Anbar ({linked?.name || '—'})</div>
                                  <div className="font-bold text-gray-800">{wh?.text || '—'}</div>
                                </div>
                                <div className="bg-white rounded-lg p-3 border">
                                  <div className="text-xs text-gray-500 mb-1">Bu setdən max</div>
                                  <div className="font-bold text-emerald-800">~{maxItem} set</div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminSetIngredients;
