import express from 'express';
import Expense from '../model/ExpenseModal.js';

const router = express.Router();

const OPERATIONAL_EXPENSE_FILTER = {
    $nor: [
        { kind: 'employee_salary' },
        { name: { $regex: /^İşçi maaşı:/ } },
    ],
};

// Get expenses (optional date or range) — yalnız məhsul/material xərcləri
router.get('/', async (req, res) => {
    try {
        const { date, from, to } = req.query;
        const query = { ...OPERATIONAL_EXPENSE_FILTER };

        if (date) {
            const start = new Date(date);
            const end = new Date(date);
            end.setDate(end.getDate() + 1);
            query.date = { $gte: start, $lt: end };
        } else if (from || to) {
            const start = from ? new Date(from) : new Date('1970-01-01');
            const end = to ? new Date(to) : new Date('2999-12-31');
            query.date = { $gte: start, $lt: end };
        }

        const expenses = await Expense.find(query).sort({ date: -1, createdAt: -1 }).lean();
        res.status(200).json(expenses);
    } catch (error) {
        res.status(500).json({ error: 'Xərclər alınarkən xəta baş verdi' });
    }
});

// Add expense (məhsul / material)
router.post('/', async (req, res) => {
    try {
        const { name, amount, note, date } = req.body;
        if (!name || amount === undefined) {
            return res.status(400).json({ error: 'Xərc adı və məbləğ tələb olunur' });
        }

        const expense = new Expense({
            name: name.trim(),
            amount: Number(amount) || 0,
            note: note || '',
            date: date ? new Date(date) : new Date(),
            kind: 'general',
        });

        await expense.save();
        res.status(201).json({ message: 'Xərc əlavə olundu', expense });
    } catch (error) {
        res.status(500).json({ error: 'Xərc əlavə edilərkən xəta baş verdi' });
    }
});

// Delete expense
router.delete('/:id', async (req, res) => {
    try {
        const expense = await Expense.findByIdAndDelete(req.params.id);
        if (!expense) {
            return res.status(404).json({ error: 'Xərc tapılmadı' });
        }
        res.status(200).json({ message: 'Xərc silindi', expense });
    } catch (error) {
        res.status(500).json({ error: 'Xərc silinərkən xəta baş verdi' });
    }
});

export default router;

