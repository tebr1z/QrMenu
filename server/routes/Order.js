import express from 'express';
import Order from '../model/OrderModal.js';

const router = express.Router();

// Bütün sifarişləri al və ya tarixə görə filtrlə
router.get('/GetOrders', async (req, res) => {
    try {
        const { date } = req.query;
        let query = {};
        if (date) {
            // YYYY-MM-DD formatında gəlir
            const start = new Date(date);
            const end = new Date(date);
            end.setDate(end.getDate() + 1);
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
        const order = new Order(req.body);
        await order.save();
        res.status(201).json({ message: 'Sifariş əlavə olundu', order });
    } catch (error) {
        res.status(500).json({ error: 'Sifariş əlavə edilərkən xəta baş verdi' });
    }
});

export default router; 