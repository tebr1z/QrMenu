import express from 'express';
import Config from '../model/ConfigModal.js';

const router = express.Router();

// Get config by key
router.get('/:key', async (req, res) => {
    try {
        const key = req.params.key;
        const config = await Config.findOne({ key }).lean();
        if (!config) {
            return res.status(200).json({ key, value: null });
        }
        res.status(200).json({ key: config.key, value: config.value });
    } catch (error) {
        res.status(500).json({ error: 'Ayarlar alınarkən xəta baş verdi' });
    }
});

// Set config by key
router.put('/:key', async (req, res) => {
    try {
        const key = req.params.key;
        const { value } = req.body;
        if (value === undefined) {
            return res.status(400).json({ error: 'Dəyər tələb olunur' });
        }

        const config = await Config.findOneAndUpdate(
            { key },
            { key, value, updatedAt: new Date() },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        res.status(200).json({ message: 'Ayar yeniləndi', key: config.key, value: config.value });
    } catch (error) {
        res.status(500).json({ error: 'Ayar yenilənərkən xəta baş verdi' });
    }
});

export default router;

