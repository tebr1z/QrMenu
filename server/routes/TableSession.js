import express from 'express';
import TableSession from '../model/TableSessionModal.js';

const router = express.Router();

// Bütün aktiv session-ları al
router.get('/Active', async (req, res) => {
    try {
        const sessions = await TableSession.find({ isActive: true });
        res.status(200).json(sessions);
    } catch (error) {
        res.status(500).json({ error: 'Aktiv masalar alınarkən xəta baş verdi' });
    }
});

// Yeni session başlat
router.post('/Start', async (req, res) => {
    try {
        const session = new TableSession(req.body);
        await session.save();
        res.status(201).json({ message: 'Masa başlatıldı', session });
    } catch (error) {
        res.status(500).json({ error: 'Masa başlatılarkən xəta baş verdi' });
    }
});

// Session-a menyu əlavə et
router.put('/:id/menu', async (req, res) => {
    try {
        const { selectedMenu } = req.body;
        const session = await TableSession.findByIdAndUpdate(
            req.params.id,
            { selectedMenu },
            { new: true }
        );
        if (!session) return res.status(404).json({ error: 'Session tapılmadı' });
        res.status(200).json({ message: 'Menyu yeniləndi', session });
    } catch (error) {
        res.status(500).json({ error: 'Menyu yenilənərkən xəta baş verdi' });
    }
});

// Timer-i yenilə
router.put('/:id/timer', async (req, res) => {
    try {
        const { timer } = req.body;
        const session = await TableSession.findByIdAndUpdate(
            req.params.id,
            { timer },
            { new: true }
        );
        if (!session) return res.status(404).json({ error: 'Session tapılmadı' });
        res.status(200).json({ message: 'Timer yeniləndi', session });
    } catch (error) {
        res.status(500).json({ error: 'Timer yenilənərkən xəta baş verdi' });
    }
});

// Session-u bitir və sil
router.delete('/:id', async (req, res) => {
    try {
        const session = await TableSession.findByIdAndDelete(req.params.id);
        if (!session) return res.status(404).json({ error: 'Session tapılmadı' });
        res.status(200).json({ message: 'Session bitirildi və silindi', session });
    } catch (error) {
        res.status(500).json({ error: 'Session silinərkən xəta baş verdi' });
    }
});

export default router; 