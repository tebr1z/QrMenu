import express from 'express';
import Expense from '../model/ExpenseModal.js';
import { CheckToken } from '../middleware/CkeckToken.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { adjustKassa, getKassaBalance } from '../utils/kassaLedger.js';
import { dayBounds, rangeBounds, parseDayStart } from '../utils/dateBounds.js';

const router = express.Router();

const OPERATIONAL_EXPENSE_FILTER = {
    $nor: [
        { kind: 'employee_salary' },
        { name: { $regex: /^İşçi maaşı:/ } },
    ],
};

// Get expenses (optional date or range) — yalnız məhsul/material xərcləri
router.get('/', CheckToken, requirePermission('Finance', 'view'), async (req, res) => {
    try {
        const { date, from, to } = req.query;
        const query = { ...OPERATIONAL_EXPENSE_FILTER };

        if (date) {
            const { start, end } = dayBounds(date);
            query.date = { $gte: start, $lt: end };
        } else if (from || to) {
            const { start, end } = rangeBounds(from, to);
            query.date = { $gte: start, $lt: end };
        }

        const expenses = await Expense.find(query).sort({ date: -1, createdAt: -1 }).lean();
        res.status(200).json(expenses);
    } catch (error) {
        res.status(500).json({ error: 'Xərclər alınarkən xəta baş verdi' });
    }
});

// Add expense — kassa eyni request-də atomik azalır
router.post('/', CheckToken, requirePermission('Finance', 'edit'), async (req, res) => {
    try {
        const { name, amount, note, date } = req.body;
        if (!name || amount === undefined) {
            return res.status(400).json({ error: 'Xərc adı və məbləğ tələb olunur' });
        }

        const expenseAmount = Number(amount) || 0;
        if (expenseAmount <= 0) {
            return res.status(400).json({ error: 'Məbləğ 0-dan böyük olmalıdır' });
        }

        const { balance } = await adjustKassa(-expenseAmount);

        let expense;
        try {
            expense = new Expense({
                name: name.trim(),
                amount: expenseAmount,
                note: note || '',
                date: date
                    ? parseDayStart(date)
                    : (() => {
                        const n = new Date();
                        return new Date(n.getFullYear(), n.getMonth(), n.getDate());
                    })(),
                kind: 'general',
            });
            await expense.save();
        } catch (saveErr) {
            // Xərc yazılmadı — kassanı qaytar
            await adjustKassa(expenseAmount, { allowNegative: true });
            throw saveErr;
        }

        res.status(201).json({
            message: 'Xərc əlavə olundu',
            expense,
            kassaBalance: balance,
        });
    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({
            error: error.code === 'INSUFFICIENT_KASSA'
                ? 'Kassada bu qədər pul yoxdur'
                : (error.message || 'Xərc əlavə edilərkən xəta baş verdi'),
        });
    }
});

// Delete expense — məbləğ kassaya qaytarılır
router.delete('/:id', CheckToken, requirePermission('Finance', 'edit'), async (req, res) => {
    try {
        const expense = await Expense.findByIdAndDelete(req.params.id);
        if (!expense) {
            return res.status(404).json({ error: 'Xərc tapılmadı' });
        }

        const amount = Number(expense.amount) || 0;
        let kassaBalance = await getKassaBalance();
        if (amount > 0 && expense.kind !== 'employee_salary') {
            const result = await adjustKassa(amount, { allowNegative: true });
            kassaBalance = result.balance;
        }

        res.status(200).json({
            message: 'Xərc silindi',
            expense,
            kassaBalance,
        });
    } catch (error) {
        res.status(500).json({ error: 'Xərc silinərkən xəta baş verdi' });
    }
});

export default router;
