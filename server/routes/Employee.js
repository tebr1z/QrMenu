import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Employee from '../model/EmployeeModal.js';
import EmployeeWithdrawal from '../model/EmployeeWithdrawalModal.js';
import { CheckToken } from '../middleware/CkeckToken.js';
import { requireRole } from '../middleware/requireRole.js';
import { verifyEmployeeToken } from '../middleware/employeeToken.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { getPayPeriod } from '../utils/payPeriod.js';
import { getFinancePayrollReport, refreshArchivedPeriodForDate } from '../utils/employeePayrollArchive.js';
import { logAudit } from '../utils/auditLog.js';
import {
    getKassaBalance as readKassaBalance,
    adjustKassa,
    appendKassaWithdrawal,
} from '../utils/kassaLedger.js';

const router = express.Router();

function todayKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function isMonthlyPayDay(date = new Date()) {
    return date.getDate() === 10;
}

function periodStartKey(date = new Date()) {
    return getPayPeriod(date).start.toISOString().slice(0, 10);
}

function normalizePayType(payType) {
    if (payType === 'monthly' || payType === 'daily_premium') return payType;
    return 'daily';
}

function hasDailyPay(payType) {
    return payType === 'daily' || payType === 'daily_premium';
}

function hasPremiumPay(payType) {
    return payType === 'monthly' || payType === 'daily_premium';
}

async function findWithdrawal(employeeId, dateKey, kind, { payType, periodStartKey: pStartKey } = {}) {
    const withKind = await EmployeeWithdrawal.findOne({ employeeId, dateKey, kind }).lean();
    if (withKind) return withKind;

    const legacy = await EmployeeWithdrawal.findOne({
        employeeId,
        dateKey,
        kind: { $exists: false },
    }).lean();
    if (!legacy) return null;

    if (kind === 'premium') {
        return legacy;
    }

    if (payType === 'monthly' && pStartKey && dateKey === pStartKey) {
        return null;
    }

    return legacy;
}

async function getEmployeePayStatus(employee, date = new Date()) {
    const period = getPayPeriod(date);
    const periodTotal = await EmployeeWithdrawal.aggregate([
        {
            $match: {
                employeeId: employee._id,
                withdrawnAt: { $gte: period.start, $lt: period.end },
            },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const periodInfo = {
        start: period.start.toISOString().slice(0, 10),
        end: period.end.toISOString().slice(0, 10),
        total: periodTotal[0]?.total || 0,
    };

    const payType = normalizePayType(employee.payType);
    const dailyAmount = Number(employee.dailyAmount) || 0;
    const monthlyAmount = Number(employee.monthlyAmount) || 0;
    const dateKey = todayKey(date);
    const pKey = periodStartKey(date);
    const payDay = isMonthlyPayDay(date);
    const legacyCtx = { payType, periodStartKey: pKey };

    const result = {
        employee: {
            _id: employee._id,
            name: employee.name,
            payType,
            dailyAmount,
            monthlyAmount,
        },
        today: {
            dateKey,
            payType,
            isPayDay: payDay,
            nextPayDay: period.start.toISOString().slice(0, 10),
        },
        period: periodInfo,
    };

    if (hasDailyPay(payType) && dailyAmount > 0) {
        const dailyW = await findWithdrawal(employee._id, dateKey, 'daily', legacyCtx);
        result.today.daily = {
            dailyAmount,
            withdrawn: Boolean(dailyW),
            withdrawnAmount: dailyW?.amount || 0,
            remaining: dailyW ? 0 : dailyAmount,
            canWithdraw: !dailyW,
        };
    }

    if (hasPremiumPay(payType) && monthlyAmount > 0) {
        const premiumW = await findWithdrawal(employee._id, pKey, 'premium', legacyCtx);
        const canWithdrawPremium = payDay && !premiumW;
        result.today.premium = {
            monthlyAmount,
            isPayDay: payDay,
            withdrawn: Boolean(premiumW),
            withdrawnAmount: premiumW?.amount || 0,
            remaining: canWithdrawPremium ? monthlyAmount : 0,
            canWithdraw: canWithdrawPremium,
        };
    }

    return result;
}

async function processWithdrawal(employee, kind, now = new Date()) {
    const payType = normalizePayType(employee.payType);

    if (kind === 'premium') {
        if (!hasPremiumPay(payType)) {
            throw Object.assign(new Error('Prim götürmə icazəsi yoxdur'), { status: 400 });
        }
        if (!isMonthlyPayDay(now)) {
            throw Object.assign(new Error('Aylıq prim yalnız ayın 10-da götürülə bilər'), { status: 400 });
        }

        const dateKey = periodStartKey(now);
        const existing = await findWithdrawal(employee._id, dateKey, 'premium', {
            payType: normalizePayType(employee.payType),
            periodStartKey: dateKey,
        });
        if (existing) {
            throw Object.assign(new Error('Bu dövr üçün prim artıq götürülüb'), { status: 400 });
        }

        const amount = Number(employee.monthlyAmount) || 0;
        if (amount <= 0) {
            throw Object.assign(new Error('Aylıq prim məbləği təyin edilməyib'), { status: 400 });
        }

        const withdrawal = new EmployeeWithdrawal({
            employeeId: employee._id,
            employeeName: employee.name,
            amount,
            dateKey,
            kind: 'premium',
            withdrawnAt: now,
        });
        await withdrawal.save();

        let newBalance;
        try {
            newBalance = await debitKassaForSalary(amount, {
                employeeName: employee.name,
                date: dateKey,
                withdrawalId: withdrawal._id.toString(),
                label: `İşçi maaşı: ${employee.name}`,
            });
        } catch (kassaErr) {
            await EmployeeWithdrawal.findByIdAndDelete(withdrawal._id).catch(() => {});
            throw kassaErr;
        }
        const payTypeNorm = normalizePayType(employee.payType);
        const logLabel = buildEmployeeLogLabel(employee.name, 'premium', payTypeNorm);
        await logEmployeePayrollAudit(
            { Id: employee._id.toString(), Name: employee.name, Email: employee.accessCode },
            {
                action: 'activity',
                resourceId: withdrawal._id.toString(),
                summary: `${logLabel} (${amount.toFixed(2)}₼)`,
                details: {
                    type: 'employee_premium',
                    kind: 'premium',
                    amount,
                    date: dateKey,
                    employeeId: employee._id.toString(),
                    employeeName: employee.name,
                },
            }
        );

        return {
            message: payType === 'monthly' ? 'Aylıq maaş uğurla götürüldü' : 'Aylıq prim uğurla götürüldü',
            withdrawal,
            kassaBalance: newBalance,
        };
    }

    if (!hasDailyPay(payType)) {
        throw Object.assign(new Error('Günlük maaş götürmə icazəsi yoxdur'), { status: 400 });
    }

    const dateKey = todayKey(now);
    const existing = await findWithdrawal(employee._id, dateKey, 'daily', {
        payType: normalizePayType(employee.payType),
        periodStartKey: periodStartKey(now),
    });
    if (existing) {
        throw Object.assign(new Error('Bu gün üçün pul artıq götürülüb'), { status: 400 });
    }

    const amount = Number(employee.dailyAmount) || 0;
    if (amount <= 0) {
        throw Object.assign(new Error('Günlük məbləğ təyin edilməyib'), { status: 400 });
    }

    const withdrawal = new EmployeeWithdrawal({
        employeeId: employee._id,
        employeeName: employee.name,
        amount,
        dateKey,
        kind: 'daily',
        withdrawnAt: now,
    });
    await withdrawal.save();

    let newBalance;
    try {
        newBalance = await debitKassaForSalary(amount, {
            employeeName: employee.name,
            date: dateKey,
            withdrawalId: withdrawal._id.toString(),
            label: `İşçi maaşı: ${employee.name}`,
        });
    } catch (kassaErr) {
        await EmployeeWithdrawal.findByIdAndDelete(withdrawal._id).catch(() => {});
        throw kassaErr;
    }
    const payTypeNorm = normalizePayType(employee.payType);
    const logLabel = buildEmployeeLogLabel(employee.name, 'daily', payTypeNorm);
    await logEmployeePayrollAudit(
        { Id: employee._id.toString(), Name: employee.name, Email: employee.accessCode },
        {
            action: 'activity',
            resourceId: withdrawal._id.toString(),
            summary: `${logLabel} (${amount.toFixed(2)}₼)`,
            details: {
                type: 'employee_withdraw',
                kind: 'daily',
                amount,
                date: dateKey,
                employeeId: employee._id.toString(),
                employeeName: employee.name,
            },
        }
    );

    return {
        message: 'Pul uğurla götürüldü',
        withdrawal,
        kassaBalance: newBalance,
    };
}

async function getKassaBalance() {
    return readKassaBalance();
}

async function debitKassaForSalary(amount, meta = {}) {
    const { balance } = await adjustKassa(-amount);
    await appendKassaWithdrawal({
        amount,
        label: meta.label || `İşçi: ${meta.employeeName || '—'}`,
        date: meta.date || new Date().toISOString().slice(0, 10),
        source: 'employee',
        type: 'withdraw',
        withdrawalId: meta.withdrawalId,
    });
    return balance;
}

async function creditKassaForSalaryReversal(amount, meta = {}) {
    const { balance } = await adjustKassa(amount, { allowNegative: true });
    await appendKassaWithdrawal({
        amount: -Math.abs(amount),
        label: meta.label || `Maaş qaytarıldı: ${meta.employeeName || '—'}`,
        date: meta.date || new Date().toISOString().slice(0, 10),
        source: 'employee',
        type: 'reversal',
        withdrawalId: meta.withdrawalId,
    });
    return balance;
}

function buildEmployeeLogLabel(employeeName, kind, payType, isReversal = false) {
    const kindLabel = kind === 'premium'
        ? (payType === 'monthly' ? 'aylıq maaş' : 'aylıq prim')
        : 'günlük maaş';

    if (isReversal) {
        return `Maaş silindi (qaytarıldı): ${employeeName} — ${kindLabel}`;
    }
    return `İşçi pul götürdü: ${employeeName} — ${kindLabel}`;
}

async function logEmployeePayrollAudit(user, { action = 'activity', resourceId = '', summary, details }) {
    await logAudit({ user }, {
        action,
        resource: 'EmployeePayroll',
        resourceId,
        summary,
        details,
    });
}

function buildEmployeeToken(employee) {
    return jwt.sign(
        {
            type: 'employee',
            employeeId: employee._id.toString(),
            name: employee.name,
            accessCode: employee.accessCode,
        },
        process.env.TOKEN_SECRET_CODE,
        { expiresIn: '12h' }
    );
}

// ——— İşçi girişi ———
router.post('/login', async (req, res) => {
    try {
        const { name, password } = req.body;
        if (!name || !password) {
            return res.status(400).json({ error: 'İstifadəçi adı və şifrə daxil edin' });
        }

        const nameTrim = String(name).trim();
        const employee = await Employee.findOne({
            name: { $regex: new RegExp(`^${nameTrim.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
            isActive: true,
        });

        if (!employee) {
            return res.status(401).json({ error: 'İstifadəçi adı və ya şifrə yanlışdır' });
        }

        const match = await bcrypt.compare(password, employee.password);
        if (!match) {
            return res.status(401).json({ error: 'İstifadəçi adı və ya şifrə yanlışdır' });
        }

        const payStatus = await getEmployeePayStatus(employee);

        res.json({
            token: buildEmployeeToken(employee),
            employee: {
                _id: employee._id,
                name: employee.name,
                accessCode: employee.accessCode,
                payType: employee.payType || 'daily',
                dailyAmount: employee.dailyAmount,
                monthlyAmount: employee.monthlyAmount,
            },
            today: payStatus.today,
            period: payStatus.period,
        });
    } catch (error) {
        res.status(500).json({ error: 'Giriş zamanı xəta baş verdi' });
    }
});

// ——— İşçi: bugünkü status ———
router.get('/me/status', verifyEmployeeToken, async (req, res) => {
    try {
        const employee = await Employee.findById(req.employee.employeeId).lean();
        if (!employee || !employee.isActive) {
            return res.status(404).json({ error: 'İşçi tapılmadı' });
        }

        const payStatus = await getEmployeePayStatus(employee);

        res.json(payStatus);
    } catch (error) {
        res.status(500).json({ error: 'Status alınmadı' });
    }
});

// ——— İşçi: pul götür ———
router.post('/me/withdraw', verifyEmployeeToken, async (req, res) => {
    try {
        const employee = await Employee.findById(req.employee.employeeId);
        if (!employee || !employee.isActive) {
            return res.status(404).json({ error: 'İşçi tapılmadı' });
        }

        const now = new Date();
        const payType = normalizePayType(employee.payType);
        let kind = req.body?.kind;

        if (!kind) {
            kind = payType === 'monthly' ? 'premium' : 'daily';
        }

        if (kind !== 'daily' && kind !== 'premium') {
            return res.status(400).json({ error: 'Yanlış ödəniş növü' });
        }

        const result = await processWithdrawal(employee, kind, now);
        const payStatus = await getEmployeePayStatus(employee, now);

        res.json({
            ...result,
            today: payStatus.today,
            period: payStatus.period,
        });
    } catch (error) {
        if (error?.code === 11000) {
            return res.status(400).json({ error: 'Bu ödəniş artıq götürülüb' });
        }
        if (error?.status) {
            return res.status(error.status).json({ error: error.message });
        }
        res.status(500).json({ error: 'Pul götürülərkən xəta baş verdi' });
    }
});

// ——— İşçi: öz tarixçəsi ———
router.get('/me/history', verifyEmployeeToken, async (req, res) => {
    try {
        const list = await EmployeeWithdrawal.find({ employeeId: req.employee.employeeId })
            .sort({ withdrawnAt: -1 })
            .limit(100)
            .lean();
        res.json(list);
    } catch (error) {
        res.status(500).json({ error: 'Tarixçə alınmadı' });
    }
});

// ——— Master Admin: işçilər ———
router.get('/', CheckToken, requireRole('master_admin'), async (req, res) => {
    try {
        const employees = await Employee.find().select('-password').sort({ name: 1 }).lean();
        const dateKey = todayKey();
        const period = getPayPeriod();
        const pStartKey = periodStartKey();

        const todayWithdrawals = await EmployeeWithdrawal.find({ dateKey, kind: 'daily' }).lean();
        const todayLegacy = await EmployeeWithdrawal.find({
            dateKey,
            kind: { $exists: false },
        }).lean();
        const todayAll = [...todayWithdrawals, ...todayLegacy];
        const todayMap = new Map(todayAll.map((w) => [String(w.employeeId), w]));

        const periodStartWithdrawals = await EmployeeWithdrawal.find({
            dateKey: pStartKey,
            $or: [{ kind: 'premium' }, { kind: { $exists: false } }],
        }).lean();
        const periodStartMap = new Map(periodStartWithdrawals.map((w) => [String(w.employeeId), w]));

        const periodTotals = await EmployeeWithdrawal.aggregate([
            { $match: { withdrawnAt: { $gte: period.start, $lt: period.end } } },
            { $group: { _id: '$employeeId', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        ]);
        const periodMap = new Map(periodTotals.map((p) => [String(p._id), p]));

        const enriched = employees.map((emp) => {
            const id = String(emp._id);
            const payType = normalizePayType(emp.payType);
            const todayW = todayMap.get(id);
            const premiumW = periodStartMap.get(id);

            let statusLabel = 'Gözləyir';
            if (payType === 'daily') {
                statusLabel = todayW ? `Götürülüb (${todayW.amount}₼)` : 'Gözləyir';
            } else if (payType === 'monthly') {
                statusLabel = premiumW ? `Götürülüb (${premiumW.amount}₼)` : 'Ayın 10-u gözlənilir';
            } else {
                const parts = [];
                if (todayW) parts.push(`Günlük: ${todayW.amount}₼`);
                if (premiumW) parts.push(`Prim: ${premiumW.amount}₼`);
                statusLabel = parts.length ? parts.join(', ') : 'Gözləyir';
            }

            const periodP = periodMap.get(id);
            return {
                ...emp,
                payType,
                todayWithdrawn: Boolean(todayW),
                todayAmount: todayW?.amount || 0,
                premiumWithdrawn: Boolean(premiumW),
                premiumAmount: premiumW?.amount || 0,
                statusLabel,
                periodTotal: periodP?.total || 0,
                periodCount: periodP?.count || 0,
            };
        });

        res.json({
            employees: enriched,
            period: {
                start: period.start.toISOString().slice(0, 10),
                end: period.end.toISOString().slice(0, 10),
            },
        });
    } catch (error) {
        res.status(500).json({ error: 'İşçilər alınmadı' });
    }
});

router.post('/', CheckToken, requireRole('master_admin'), async (req, res) => {
    try {
        const { name, accessCode, password, dailyAmount, monthlyAmount, payType } = req.body;
        if (!name || !accessCode || !password) {
            return res.status(422).json({ error: 'Ad, kod və şifrə tələb olunur' });
        }

        const exists = await Employee.findOne({ accessCode: String(accessCode).trim() });
        if (exists) {
            return res.status(422).json({ error: 'Bu kod artıq mövcuddur' });
        }

        const validPayType = ['daily', 'monthly', 'daily_premium'].includes(payType)
            ? payType
            : 'daily';

        const employee = new Employee({
            name: String(name).trim(),
            accessCode: String(accessCode).trim(),
            password: await bcrypt.hash(password, 10),
            payType: validPayType,
            dailyAmount: Number(dailyAmount) || 0,
            monthlyAmount: Number(monthlyAmount) || 0,
        });
        await employee.save();

        res.status(201).json({
            message: 'İşçi yaradıldı',
            employee: {
                _id: employee._id,
                name: employee.name,
                accessCode: employee.accessCode,
                payType: employee.payType,
                dailyAmount: employee.dailyAmount,
                monthlyAmount: employee.monthlyAmount,
                isActive: employee.isActive,
            },
        });
    } catch (error) {
        res.status(500).json({ error: 'İşçi yaradılarkən xəta baş verdi' });
    }
});

router.put('/:id', CheckToken, requireRole('master_admin'), async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id);
        if (!employee) return res.status(404).json({ error: 'İşçi tapılmadı' });

        const { name, accessCode, password, dailyAmount, monthlyAmount, payType, isActive } = req.body;
        if (name) employee.name = String(name).trim();
        if (accessCode) {
            const dup = await Employee.findOne({
                accessCode: String(accessCode).trim(),
                _id: { $ne: employee._id },
            });
            if (dup) return res.status(422).json({ error: 'Bu kod artıq mövcuddur' });
            employee.accessCode = String(accessCode).trim();
        }
        if (password) employee.password = await bcrypt.hash(password, 10);
        if (payType !== undefined) {
            employee.payType = ['daily', 'monthly', 'daily_premium'].includes(payType)
                ? payType
                : 'daily';
        }
        if (dailyAmount !== undefined) employee.dailyAmount = Number(dailyAmount) || 0;
        if (monthlyAmount !== undefined) employee.monthlyAmount = Number(monthlyAmount) || 0;
        if (isActive !== undefined) employee.isActive = Boolean(isActive);

        await employee.save();
        res.json({
            _id: employee._id,
            name: employee.name,
            accessCode: employee.accessCode,
            payType: employee.payType,
            dailyAmount: employee.dailyAmount,
            monthlyAmount: employee.monthlyAmount,
            isActive: employee.isActive,
        });
    } catch (error) {
        res.status(500).json({ error: 'İşçi yenilənərkən xəta baş verdi' });
    }
});

router.delete('/:id', CheckToken, requireRole('master_admin'), async (req, res) => {
    try {
        const employee = await Employee.findByIdAndDelete(req.params.id);
        if (!employee) return res.status(404).json({ error: 'İşçi tapılmadı' });
        res.json({ message: 'İşçi silindi' });
    } catch (error) {
        res.status(500).json({ error: 'İşçi silinərkən xəta baş verdi' });
    }
});

router.get('/payroll/finance', CheckToken, requirePermission('Finance', 'view'), async (req, res) => {
    try {
        const { date } = req.query;
        const report = await getFinancePayrollReport(date || undefined);
        res.json(report);
    } catch (error) {
        console.error('Payroll finance report error:', error);
        res.status(500).json({ error: 'Maaş hesabatı alınmadı' });
    }
});

router.delete('/withdrawals/:id', CheckToken, requireRole('master_admin'), async (req, res) => {
    try {
        const withdrawal = await EmployeeWithdrawal.findById(req.params.id);
        if (!withdrawal) {
            return res.status(404).json({ error: 'Maaş çıxışı tapılmadı' });
        }

        const amount = Number(withdrawal.amount) || 0;
        const kind = withdrawal.kind || 'daily';
        await EmployeeWithdrawal.findByIdAndDelete(withdrawal._id);

        const newBalance = await creditKassaForSalaryReversal(amount, {
            employeeName: withdrawal.employeeName,
            date: withdrawal.dateKey,
            withdrawalId: withdrawal._id.toString(),
            label: `Maaş qaytarıldı: ${withdrawal.employeeName}`,
        });

        const employee = await Employee.findById(withdrawal.employeeId).lean();
        const payTypeNorm = normalizePayType(employee?.payType);
        const logLabel = buildEmployeeLogLabel(withdrawal.employeeName, kind, payTypeNorm, true);

        await logEmployeePayrollAudit(
            {
                Id: req.user?.Id || req.user?.id || 'admin',
                Name: req.user?.Name || req.user?.name || 'Admin',
                Email: req.user?.Email || req.user?.email || '',
            },
            {
                action: 'delete',
                resourceId: withdrawal._id.toString(),
                summary: `${logLabel} (+${amount.toFixed(2)}₼ kassaya qaytarıldı)`,
                details: {
                    type: 'employee_reversal',
                    kind,
                    amount,
                    date: withdrawal.dateKey,
                    employeeId: withdrawal.employeeId.toString(),
                    employeeName: withdrawal.employeeName,
                    deletedBy: req.user?.Name || req.user?.name || 'Admin',
                },
            }
        );

        await refreshArchivedPeriodForDate(withdrawal.dateKey);

        res.json({
            message: 'Maaş çıxışı silindi',
            kassaBalance: newBalance,
            dateKey: withdrawal.dateKey,
            employeeId: withdrawal.employeeId.toString(),
            amount,
        });
    } catch (error) {
        console.error('Delete employee withdrawal error:', error);
        res.status(500).json({ error: 'Maaş çıxışı silinərkən xəta baş verdi' });
    }
});

/** Finance xalis hesabı üçün — dateKey (YYYY-MM-DD) üzrə inklüziv aralıq */
router.get('/withdrawals/all', CheckToken, requirePermission('Finance', 'view'), async (req, res) => {
    try {
        const { from, to } = req.query;
        const query = {};
        if (from || to) {
            query.dateKey = {};
            if (from) query.dateKey.$gte = String(from).slice(0, 10);
            if (to) query.dateKey.$lte = String(to).slice(0, 10);
        }

        const list = await EmployeeWithdrawal.find(query).sort({ withdrawnAt: -1 }).limit(2000).lean();
        const period = getPayPeriod();
        const total = list.reduce((s, w) => s + (Number(w.amount) || 0), 0);

        res.json({
            withdrawals: list,
            total,
            period: {
                start: period.start.toISOString().slice(0, 10),
                end: period.end.toISOString().slice(0, 10),
            },
        });
    } catch (error) {
        res.status(500).json({ error: 'Çıxarışlar alınmadı' });
    }
});

export default router;
