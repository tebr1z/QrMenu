import React, { useContext, useEffect } from 'react';
import { ContextUser } from '../../context/CheckUserContext';
import { toast } from 'react-toastify';

const LowStockNotifier = () => {
  const { apiClient, hasJwtToken, authReady } = useContext(ContextUser);

  useEffect(() => {
    if (!hasJwtToken || !authReady) return;

    const check = async () => {
      try {
        const res = await apiClient.get('/stock/low-stock');
        const list = Array.isArray(res.data) ? res.data : [];
        if (list.length > 0) {
          const names = list.slice(0, 3).map((p) => p.name).join(', ');
          const more = list.length > 3 ? ` və ${list.length - 3} digər` : '';
          toast.warning(`Az stok: ${names}${more}`, { toastId: 'low-stock-alert', autoClose: 8000 });
          window.dispatchEvent(new CustomEvent('low-stock-update', { detail: list }));
        }
      } catch {
        // ignore
      }
    };

    check();
    const interval = setInterval(check, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [apiClient, hasJwtToken, authReady]);

  return null;
};

export function notifyLowStockFromOrder(alerts) {
  if (!Array.isArray(alerts) || alerts.length === 0) return;
  alerts.forEach((p) => {
    toast.warning(`Satışdan sonra az stok: ${p.name}`, { autoClose: 6000 });
  });
  window.dispatchEvent(new CustomEvent('low-stock-update', { detail: alerts }));
}

export default LowStockNotifier;
