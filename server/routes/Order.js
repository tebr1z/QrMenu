import express from 'express';
import Order from '../model/OrderModal.js';
import { CheckToken } from '../middleware/CkeckToken.js';
import { requireRole } from '../middleware/requireRole.js';
import Auth from '../model/AuthModel.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { hasPermission, isMasterAdmin } from '../utils/permissions.js';
import { applyStockDeductionForOrder } from '../utils/stockDeduction.js';
import { adjustKassa } from '../utils/kassaLedger.js';
import { logAudit } from '../utils/auditLog.js';
import { dayBounds, rangeBounds } from '../utils/dateBounds.js';

const router = express.Router();

async function requireOrderRead(req, res, next) {
    try {
        if (isMasterAdmin(req.user?.Role)) return next();
        const user = await Auth.findById(req.user.Id).select('role permissions').lean();
        if (!user) return res.status(403).json({ error: 'İstifadəçi tapılmadı' });
        const ok =
            hasPermission(user, 'Accounts', 'view') ||
            hasPermission(user, 'Finance', 'view') ||
            hasPermission(user, 'SalesReport', 'view') ||
            hasPermission(user, 'SoldProducts', 'view');
        if (!ok) return res.status(403).json({ error: 'Bu əməliyyat üçün icazəniz yoxdur' });
        next();
    } catch {
        res.status(500).json({ error: 'İcazə yoxlanışı uğursuz oldu' });
    }
}

// Bütün sifarişləri al və ya tarixə / intervala görə filtrlə
router.get('/GetOrders', CheckToken, requireOrderRead, async (req, res) => {
    try {
        const { date, from, to } = req.query;
        const query = {};

        if (date) {
            const { start, end } = dayBounds(date);
            query.createdAt = { $gte: start, $lt: end };
        } else if (from || to) {
            const { start, end } = rangeBounds(from, to);
            query.createdAt = { $gte: start, $lt: end };
        }

        const orders = await Order.find(query).sort({ createdAt: -1 });
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ error: 'Sifarişlər alınarkən xəta baş verdi' });
    }
});

// Köhnə yol — yalnız autentifikasiyalı; əsas axın tablesession/finish
router.post('/AddOrder', CheckToken, requirePermission('TableManage', 'edit'), async (req, res) => {
    try {
        const { tableId, startTime, endTime, orderId, sessionId } = req.body;

        if (sessionId) {
            const bySession = await Order.findOne({ sessionId: String(sessionId) });
            if (bySession) {
                return res.status(409).json({
                    error: 'Bu sifariş artıq yaradılıb',
                    order: bySession,
                });
            }
        }

        if (tableId != null && startTime != null) {
            const byStart = await Order.findOne({
                tableId: String(tableId),
                startTime: Number(startTime),
            });
            if (byStart) {
                return res.status(409).json({
                    error: 'Bu sifariş artıq yaradılıb',
                    order: byStart,
                });
            }
        }

        const duplicateQuery = orderId
            ? {
                $or: [
                    { orderId },
                    {
                        tableId,
                        startTime: { $gte: startTime - 10000, $lte: startTime + 10000 },
                        endTime: { $gte: endTime - 10000, $lte: endTime + 10000 },
                    },
                ],
            }
            : {
                tableId,
                startTime: { $gte: startTime - 10000, $lte: startTime + 10000 },
                endTime: { $gte: endTime - 10000, $lte: endTime + 10000 },
            };

        const existingOrder = await Order.findOne(duplicateQuery);
        if (existingOrder) {
            return res.status(409).json({
                error: 'Bu sifariş artıq yaradılıb',
                order: existingOrder,
            });
        }

        const order = new Order({
            ...req.body,
            sessionId: sessionId ? String(sessionId) : undefined,
        });
        await order.save();

        const orderTotal = Number(order.total) || 0;
        if (orderTotal > 0) {
            try {
                await adjustKassa(orderTotal, { allowNegative: true });
            } catch (kassaErr) {
                if (process.env.NODE_ENV === 'development') {
                    console.error('[AddOrder] Kassa xətası:', kassaErr);
                }
            }
        }

        let lowStockAlerts = [];
        if (order.selectedMenu && Array.isArray(order.selectedMenu) && order.selectedMenu.length > 0) {
            lowStockAlerts = await applyStockDeductionForOrder(order.selectedMenu);
        }

        res.status(201).json({ message: 'Sifariş əlavə olundu', order, lowStockAlerts });
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error('AddOrder error:', error);
        }
        res.status(500).json({ error: 'Sifariş əlavə edilərkən xəta baş verdi' });
    }
});

// Sifarişi sil — YALNIZ Master Admin
router.delete('/:id', CheckToken, requireRole('master_admin'), async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ error: 'Sifariş tapılmadı' });
        }
        const orderTotal = Number(order.total) || 0;
        await Order.findByIdAndDelete(req.params.id);

        if (orderTotal > 0) {
            await adjustKassa(-orderTotal, { allowNegative: true });
        }

        await logAudit(req, {
            action: 'delete',
            resource: 'Order',
            resourceId: order._id,
            summary: `Bitmiş sifariş silindi: ${order.tableName} (${orderTotal.toFixed(2)}₼)`,
            details: {
                tableName: order.tableName,
                total: orderTotal,
                startTime: order.startTime,
                endTime: order.endTime,
            },
        });

        res.status(200).json({ message: 'Sifariş silindi', order });
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error('DeleteOrder error:', error);
        }
        res.status(500).json({ error: 'Sifariş silinərkən xəta baş verdi' });
    }
});

export default router;
