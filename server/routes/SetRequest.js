import express from 'express';
import SetRequest from '../model/SetRequestModal.js';
import { CheckToken } from '../middleware/CkeckToken.js';

const router = express.Router();

// Müştəri öz set sorğusu yaradır (token tələb olunmur)
router.post('/', async (req, res) => {
    try {
        const { customerName, setDescription, phone } = req.body;
        if (!setDescription || !String(setDescription).trim()) {
            return res.status(400).json({ error: 'Set haqqında məlumat tələb olunur' });
        }
        const doc = new SetRequest({
            customerName: customerName ? String(customerName).trim() : '',
            setDescription: String(setDescription).trim(),
            phone: phone ? String(phone).trim() : '',
        });
        const saved = await doc.save();
        res.status(201).json({ message: 'Sorğunuz qeydə alındı', request: saved });
    } catch (err) {
        console.error('SetRequest POST error:', err);
        res.status(500).json({ error: 'Sorğu göndərilərkən xəta baş verdi' });
    }
});

// Admin bütün sorğuları görür və telefon redaktə edə bilər
router.use(CheckToken);

router.get('/', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit, 10) || 0;
        let query = SetRequest.find().sort({ createdAt: -1 });
        if (limit > 0) query = query.limit(limit);
        const list = await query.lean();
        res.json(list);
    } catch (err) {
        console.error('SetRequest GET error:', err);
        res.status(500).json({ error: 'Sorğular gətirilərkən xəta baş verdi' });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { phone, customerName } = req.body;
        const update = {};
        if (phone !== undefined) update.phone = String(phone).trim();
        if (customerName !== undefined) update.customerName = String(customerName).trim();
        const doc = await SetRequest.findByIdAndUpdate(
            req.params.id,
            update,
            { new: true }
        );
        if (!doc) return res.status(404).json({ error: 'Sorğu tapılmadı' });
        res.json(doc);
    } catch (err) {
        console.error('SetRequest PUT error:', err);
        res.status(500).json({ error: 'Sorğu yenilənərkən xəta baş verdi' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const doc = await SetRequest.findByIdAndDelete(req.params.id);
        if (!doc) return res.status(404).json({ error: 'Sorğu tapılmadı' });
        res.json({ message: 'Sorğu silindi' });
    } catch (err) {
        console.error('SetRequest DELETE error:', err);
        res.status(500).json({ error: 'Sorğu silinərkən xəta baş verdi' });
    }
});

export default router;
