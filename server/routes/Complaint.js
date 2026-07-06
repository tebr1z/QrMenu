import express from 'express';
import Complaint from '../model/ComplaintModal.js';
import { CheckToken } from '../middleware/CkeckToken.js';

const router = express.Router();

// Müştəri şikayət göndərir (token tələb olunmur)
router.post('/', async (req, res) => {
    try {
        const { message } = req.body;

        if (!message || !String(message).trim()) {
            return res.status(400).json({ error: 'Şikayət mətni tələb olunur' });
        }

        const doc = new Complaint({
            message: String(message).trim(),
        });

        const saved = await doc.save();
        res.status(201).json({ message: 'Şikayətiniz qeydə alındı', complaint: saved });
    } catch (err) {
        console.error('Complaint POST error:', err);
        res.status(500).json({ error: 'Şikayət göndərilərkən xəta baş verdi' });
    }
});

router.use(CheckToken);

router.get('/', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit, 10) || 0;
        let query = Complaint.find().sort({ createdAt: -1 });
        if (limit > 0) query = query.limit(limit);
        const list = await query.lean();
        res.json(list);
    } catch (err) {
        console.error('Complaint GET error:', err);
        res.status(500).json({ error: 'Şikayətlər gətirilərkən xəta baş verdi' });
    }
});

const markComplaintRead = async (req, res) => {
    try {
        const doc = await Complaint.findByIdAndUpdate(
            req.params.id,
            { isRead: true },
            { new: true }
        ).lean();
        if (!doc) return res.status(404).json({ error: 'Şikayət tapılmadı' });
        res.json(doc);
    } catch (err) {
        console.error('Complaint read error:', err);
        res.status(500).json({ error: 'Yenilənərkən xəta baş verdi' });
    }
};

router.patch('/:id/read', markComplaintRead);
router.put('/:id/read', markComplaintRead);

router.delete('/:id', async (req, res) => {
    try {
        const doc = await Complaint.findByIdAndDelete(req.params.id);
        if (!doc) return res.status(404).json({ error: 'Şikayət tapılmadı' });
        res.json({ message: 'Şikayət silindi' });
    } catch (err) {
        console.error('Complaint DELETE error:', err);
        res.status(500).json({ error: 'Şikayət silinərkən xəta baş verdi' });
    }
});

export default router;
