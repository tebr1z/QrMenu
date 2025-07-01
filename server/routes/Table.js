import express from 'express';
import Table from '../model/TableModal.js';

const router = express.Router();

// Get all tables
router.get('/GetTables', async (req, res) => {
    try {
        const tables = await Table.find({});
        res.status(200).json(tables);
    } catch (error) {
        res.status(500).json({ error: "Masalar alınarkən xəta baş verdi" });
    }
});

// Add new table
router.post('/AddTable', async (req, res) => {
    const { name, hourlyPrice } = req.body;
    if (!name || hourlyPrice === undefined) {
        return res.status(400).json({ error: "Masa adı və saatlıq qiymət tələb olunur" });
    }
    try {
        const newTable = new Table({ name, hourlyPrice });
        await newTable.save();
        res.status(201).json({ message: "Masa əlavə olundu", newTable });
    } catch (error) {
        res.status(500).json({ error: "Masa əlavə edilərkən xəta baş verdi" });
    }
});

// Delete table
router.delete('/DeleteTable/:id', async (req, res) => {
    try {
        const table = await Table.findByIdAndDelete(req.params.id);
        if (!table) return res.status(404).json({ error: "Masa tapılmadı" });
        res.status(200).json({ message: "Masa silindi", table });
    } catch (error) {
        res.status(500).json({ error: "Masa silinərkən xəta baş verdi" });
    }
});

// Update table
router.put('/UpdateTable/:id', async (req, res) => {
    const { name, hourlyPrice } = req.body;
    try {
        const table = await Table.findByIdAndUpdate(
            req.params.id,
            { name, hourlyPrice },
            { new: true }
        );
        if (!table) return res.status(404).json({ error: "Masa tapılmadı" });
        res.status(200).json({ message: "Masa yeniləndi", table });
    } catch (error) {
        res.status(500).json({ error: "Masa yenilənərkən xəta baş verdi" });
    }
});

export default router; 