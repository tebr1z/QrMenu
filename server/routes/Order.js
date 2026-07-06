import express from 'express';
import Order from '../model/OrderModal.js';
import Config from '../model/ConfigModal.js';
import { applyStockDeductionForOrder } from '../utils/stockDeduction.js';

const router = express.Router();

// Bütün sifarişləri al və ya tarixə / intervala görə filtrlə
router.get('/GetOrders', async (req, res) => {
    try {
        const { date, from, to } = req.query;
        const query = {};

        if (date) {
            // YYYY-MM-DD formatında gəlir
            const start = new Date(date);
            const end = new Date(date);
            end.setDate(end.getDate() + 1);
            query.createdAt = { $gte: start, $lt: end };
        } else if (from || to) {
            const start = from ? new Date(from) : new Date('1970-01-01');
            const end = to ? new Date(to) : new Date('2999-12-31');
            query.createdAt = { $gte: start, $lt: end };
        }

        const orders = await Order.find(query).sort({ createdAt: -1 });
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ error: 'Sifarişlər alınarkən xəta baş verdi' });
    }
});

// Yeni sifariş əlavə et
router.post('/AddOrder', async (req, res) => {
    try {
        const { tableId, startTime, endTime, orderId } = req.body;
        
        // Optimized duplicate check - single query with $or
        const duplicateQuery = orderId 
            ? { $or: [{ orderId: orderId }, { tableId, startTime: { $gte: startTime - 10000, $lte: startTime + 10000 }, endTime: { $gte: endTime - 10000, $lte: endTime + 10000 } }] }
            : { tableId, startTime: { $gte: startTime - 10000, $lte: startTime + 10000 }, endTime: { $gte: endTime - 10000, $lte: endTime + 10000 } };
        
        const existingOrder = await Order.findOne(duplicateQuery);
        
        if (existingOrder) {
            return res.status(409).json({ 
                error: 'Bu sifariş artıq yaradılıb', 
                order: existingOrder 
            });
        }
        
        const order = new Order(req.body);
        await order.save();

        // Kassaya dərhal əlavə et (stokdan əvvəl – ki, həmişə kassaya düşsün)
        const orderTotal = Number(order.total) || 0;
        if (orderTotal > 0) {
            const maxRetries = 3;
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    const configBalance = await Config.findOne({ key: 'kassaBalance' }).lean();
                    const current = configBalance && typeof configBalance.value === 'number' ? configBalance.value : 0;
                    const newBalance = current + orderTotal;
                    await Config.findOneAndUpdate(
                        { key: 'kassaBalance' },
                        { key: 'kassaBalance', value: newBalance, updatedAt: new Date() },
                        { upsert: true, new: true }
                    );
                    break;
                } catch (kassaErr) {
                    if (process.env.NODE_ENV === 'development') {
                        console.error(`[AddOrder] Kassa yeniləmə cəhdi ${attempt}/${maxRetries}:`, kassaErr);
                    }
                    if (attempt === maxRetries) throw kassaErr;
                    await new Promise(r => setTimeout(r, 100 * attempt));
                }
            }
        }
        
        let lowStockAlerts = [];
        if (order.selectedMenu && Array.isArray(order.selectedMenu) && order.selectedMenu.length > 0) {
            lowStockAlerts = await applyStockDeductionForOrder(order.selectedMenu);
        }

        res.status(201).json({ message: 'Sifariş əlavə olundu', order, lowStockAlerts });
    } catch (error) {
        // Log error for debugging but don't expose details to client
        if (process.env.NODE_ENV === 'development') {
            console.error('AddOrder error:', error);
        }
        res.status(500).json({ error: 'Sifariş əlavə edilərkən xəta baş verdi' });
    }
});

// Sifarişi sil – kassadan da həmin sifarişin məbləği çıxılır (Admin/Accounts)
router.delete('/:id', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ error: 'Sifariş tapılmadı' });
        }
        const orderTotal = Number(order.total) || 0;
        await Order.findByIdAndDelete(req.params.id);

        if (orderTotal > 0) {
            const configBalance = await Config.findOne({ key: 'kassaBalance' }).lean();
            const current = configBalance && typeof configBalance.value === 'number' ? configBalance.value : 0;
            const newBalance = Math.max(0, current - orderTotal);
            await Config.findOneAndUpdate(
                { key: 'kassaBalance' },
                { key: 'kassaBalance', value: newBalance, updatedAt: new Date() },
                { upsert: true, new: true }
            );
        }

        res.status(200).json({ message: 'Sifariş silindi', order });
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error('DeleteOrder error:', error);
        }
        res.status(500).json({ error: 'Sifariş silinərkən xəta baş verdi' });
    }
});

export default router; 