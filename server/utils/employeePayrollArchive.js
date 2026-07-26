import EmployeeWithdrawal from '../model/EmployeeWithdrawalModal.js';
import EmployeePayrollArchive from '../model/EmployeePayrollArchiveModal.js';
import {
    getPayPeriod,
    getPreviousPeriod,
    periodKeyFromRange,
    formatPeriodLabel,
} from './payPeriod.js';

function groupWithdrawalsByEmployee(withdrawals) {
    const byEmployee = new Map();

    withdrawals.forEach((w) => {
        const id = String(w.employeeId);
        if (!byEmployee.has(id)) {
            byEmployee.set(id, {
                employeeId: id,
                employeeName: w.employeeName,
                total: 0,
                days: [],
            });
        }
        const entry = byEmployee.get(id);
        entry.total += Number(w.amount) || 0;
        entry.days.push({
            withdrawalId: String(w._id),
            date: w.dateKey,
            amount: Number(w.amount) || 0,
            withdrawnAt: w.withdrawnAt,
        });
    });

    return Array.from(byEmployee.values()).sort((a, b) =>
        a.employeeName.localeCompare(b.employeeName, 'az')
    );
}

export async function buildPeriodSummary(start, end) {
    const withdrawals = await EmployeeWithdrawal.find({
        withdrawnAt: { $gte: start, $lt: end },
    })
        .sort({ withdrawnAt: -1 })
        .lean();

    const employees = groupWithdrawalsByEmployee(withdrawals);
    const totalAmount = employees.reduce((s, e) => s + e.total, 0);

    return {
        periodKey: periodKeyFromRange(start, end),
        start: start.toISOString().slice(0, 10),
        end: end.toISOString().slice(0, 10),
        label: formatPeriodLabel(start, end),
        employees,
        totalAmount,
        withdrawalCount: withdrawals.length,
    };
}

/** Ayın 10-u keçəndə bitmiş 10–10 dövrlərini arxivlə (keçmiş aylar daxil) */
export async function ensureCompletedPeriodsArchived(referenceDate = new Date()) {
    const now = new Date(referenceDate);
    if (now.getDate() < 10) return;

    let { start, end, periodKey } = getPreviousPeriod(now);

    for (let i = 0; i < 24; i += 1) {
        const exists = await EmployeePayrollArchive.findOne({ periodKey }).lean();
        if (!exists) {
            const summary = await buildPeriodSummary(start, end);
            await EmployeePayrollArchive.create({
                ...summary,
                archivedAt: new Date(),
            });
        }

        end = new Date(start);
        start = new Date(end);
        start.setMonth(start.getMonth() - 1);
        periodKey = periodKeyFromRange(start, end);
    }
}

function localDateKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export async function getFinancePayrollReport(dateStr) {
    const dayKey = dateStr
        ? String(dateStr).slice(0, 10)
        : localDateKey(new Date());
    const ref = new Date(`${dayKey}T12:00:00`);
    await ensureCompletedPeriodsArchived(new Date());

    const period = getPayPeriod(ref);
    const current = await buildPeriodSummary(period.start, period.end);
    const dayWithdrawals = await EmployeeWithdrawal.find({ dateKey: dayKey })
        .sort({ withdrawnAt: -1 })
        .lean();
    const todayByEmployee = groupWithdrawalsByEmployee(dayWithdrawals);
    const todayTotal = todayByEmployee.reduce((s, e) => s + e.total, 0);

    const archives = await EmployeePayrollArchive.find()
        .sort({ end: -1 })
        .limit(24)
        .lean();

    const enrichedArchives = await Promise.all(
        archives.map(async (a) => {
            const start = new Date(`${a.start}T00:00:00`);
            const end = new Date(`${a.end}T00:00:00`);
            const withdrawals = await EmployeeWithdrawal.find({
                withdrawnAt: { $gte: start, $lt: end },
            }).lean();
            const employees = groupWithdrawalsByEmployee(withdrawals);
            const totalAmount = employees.reduce((s, e) => s + e.total, 0);
            return {
                ...a,
                employees,
                totalAmount,
                withdrawalCount: withdrawals.length,
                label: formatPeriodLabel(a.start, a.end),
            };
        })
    );

    return {
        periodType: '10-10',
        selectedDate: dayKey,
        currentPeriod: current,
        today: {
            date: dayKey,
            employees: todayByEmployee,
            total: todayTotal,
        },
        archives: enrichedArchives,
    };
}

export async function refreshArchivedPeriodForDate(dateKey) {
    const ref = new Date(`${dateKey}T12:00:00`);
    const period = getPayPeriod(ref);
    const periodKey = periodKeyFromRange(period.start, period.end);
    const archived = await EmployeePayrollArchive.findOne({ periodKey }).lean();
    if (!archived) return;

    const summary = await buildPeriodSummary(period.start, period.end);
    await EmployeePayrollArchive.findOneAndUpdate(
        { periodKey },
        { ...summary, archivedAt: archived.archivedAt }
    );
}
