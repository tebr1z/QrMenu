import express from 'express';
import TableSession from '../model/TableSessionModal.js';

const router = express.Router();

// Bütün aktiv session-ları al
router.get('/Active', async (req, res) => {
    try {
        // Optimized: use lean() and select only needed fields
        const sessions = await TableSession.find({ isActive: true })
            .select("tableId tableName startTime hourlyPrice selectedMenu timer isActive selectedSet setFreeMinutes selectedHours countdownStarted countdownStartTime psType selectedFreeMinutes psHistory createdAt")
            .lean();
        res.status(200).json(sessions);
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error('Active sessions error:', error);
        }
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

// Session-u yenilə (set və saat seçimi üçün)
router.put('/:id/update', async (req, res) => {
    try {
        const { selectedSet, setFreeMinutes, selectedHours, countdownStarted, countdownStartTime, psType, hourlyPrice } = req.body;
        const updateData = {};
        if (selectedSet !== undefined) updateData.selectedSet = selectedSet;
        if (setFreeMinutes !== undefined) updateData.setFreeMinutes = setFreeMinutes;
        if (selectedHours !== undefined) updateData.selectedHours = selectedHours;
        if (countdownStarted !== undefined) updateData.countdownStarted = countdownStarted;
        if (countdownStartTime !== undefined) updateData.countdownStartTime = countdownStartTime;
        if (psType !== undefined) updateData.psType = psType;
        if (hourlyPrice !== undefined) updateData.hourlyPrice = hourlyPrice;
        
        const session = await TableSession.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );
        if (!session) return res.status(404).json({ error: 'Session tapılmadı' });
        res.status(200).json({ message: 'Session yeniləndi', session });
    } catch (error) {
        res.status(500).json({ error: 'Session yenilənərkən xəta baş verdi' });
    }
});

// PS növünü dəyişdir
router.put('/:id/changePS', async (req, res) => {
    try {
        const { psType, hourlyPrice } = req.body;
        const session = await TableSession.findById(req.params.id);
        if (!session) return res.status(404).json({ error: 'Session tapılmadı' });
        
        const now = Date.now();
        
        // Əvvəlki PS-i bağla (əgər varsa)
        if (session.psHistory && session.psHistory.length > 0) {
            const lastPS = session.psHistory[session.psHistory.length - 1];
            if (!lastPS.endTime) {
                lastPS.endTime = now;
            }
        }
        
        // Yeni PS əlavə et
        const newPSHistory = {
            psType: psType,
            hourlyPrice: hourlyPrice,
            startTime: now,
            endTime: null
        };
        
        session.psHistory = session.psHistory || [];
        session.psHistory.push(newPSHistory);
        session.psType = psType;
        session.hourlyPrice = hourlyPrice;
        
        await session.save();
        res.status(200).json({ message: 'PS növü dəyişdirildi', session });
    } catch (error) {
        res.status(500).json({ error: 'PS növü dəyişdirilərkən xəta baş verdi' });
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