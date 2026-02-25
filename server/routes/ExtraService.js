import express from 'express';
import ExtraService from '../model/ExtraServiceModal.js';

const router = express.Router();

// Get all extra services
router.get('/', async (req, res) => {
    try {
        const services = await ExtraService.find({}).sort({ createdAt: -1 }).lean();
        res.status(200).json(services);
    } catch (error) {
        res.status(500).json({ error: 'Əlavə xidmətlər alınarkən xəta baş verdi' });
    }
});

// Add extra service
router.post('/', async (req, res) => {
    const { name, price } = req.body;
    if (!name || price === undefined) {
        return res.status(400).json({ error: 'Xidmət adı və qiymət tələb olunur' });
    }
    try {
        const service = new ExtraService({ name: name.trim(), price: Number(price) || 0 });
        await service.save();
        res.status(201).json({ message: 'Əlavə xidmət əlavə olundu', service });
    } catch (error) {
        res.status(500).json({ error: 'Əlavə xidmət əlavə edilərkən xəta baş verdi' });
    }
});

// Update extra service
router.put('/:id', async (req, res) => {
    const { name, price } = req.body;
    try {
        const service = await ExtraService.findByIdAndUpdate(
            req.params.id,
            { name: name?.trim(), price: Number(price) || 0 },
            { new: true }
        );
        if (!service) return res.status(404).json({ error: 'Xidmət tapılmadı' });
        res.status(200).json({ message: 'Əlavə xidmət yeniləndi', service });
    } catch (error) {
        res.status(500).json({ error: 'Əlavə xidmət yenilənərkən xəta baş verdi' });
    }
});

// Delete extra service
router.delete('/:id', async (req, res) => {
    try {
        const service = await ExtraService.findByIdAndDelete(req.params.id);
        if (!service) return res.status(404).json({ error: 'Xidmət tapılmadı' });
        res.status(200).json({ message: 'Əlavə xidmət silindi', service });
    } catch (error) {
        res.status(500).json({ error: 'Əlavə xidmət silinərkən xəta baş verdi' });
    }
});

export default router;
