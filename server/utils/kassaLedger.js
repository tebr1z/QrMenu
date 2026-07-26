import Config from '../model/ConfigModal.js';

const BALANCE_KEY = 'kassaBalance';
const WITHDRAWALS_KEY = 'kassaWithdrawals';

/**
 * Atomik kassa dəyişikliyi ($inc) — race condition yaratmır.
 * @param {number} delta müsbət = artır, mənfi = azalt
 * @param {{ allowNegative?: boolean }} opts
 * @returns {Promise<{ balance: number, previous: number }>}
 */
export async function adjustKassa(delta, opts = {}) {
    const amount = Number(delta) || 0;
    if (amount === 0) {
        const balance = await getKassaBalance();
        return { balance, previous: balance };
    }

    // Mixed tip / köhnə string dəyərlər $inc-i poza bilər — əvvəlcə numberə çevir
    const existing = await Config.findOne({ key: BALANCE_KEY }).lean();
    if (!existing) {
        await Config.create({ key: BALANCE_KEY, value: 0, createdAt: new Date(), updatedAt: new Date() });
    } else if (typeof existing.value !== 'number') {
        const coerced = Math.round((Number(existing.value) || 0) * 100) / 100;
        await Config.updateOne(
            { key: BALANCE_KEY },
            { $set: { value: coerced, updatedAt: new Date() } }
        );
    }

    // Debit: balans kifayət etməsə atomik fail (race-safe)
    if (amount < 0 && !opts.allowNegative) {
        const need = Math.abs(amount);
        const updated = await Config.findOneAndUpdate(
            { key: BALANCE_KEY, value: { $gte: need - 0.001 } },
            { $inc: { value: amount }, $set: { updatedAt: new Date() } },
            { new: true }
        );
        if (!updated) {
            const err = new Error('Kassada kifayət qədər pul yoxdur');
            err.status = 400;
            err.code = 'INSUFFICIENT_KASSA';
            throw err;
        }
        let balance = typeof updated.value === 'number' ? updated.value : 0;
        const rounded = Math.round(balance * 100) / 100;
        if (rounded !== balance) {
            await Config.updateOne({ key: BALANCE_KEY }, { $set: { value: rounded, updatedAt: new Date() } });
            balance = rounded;
        }
        return { balance, previous: Math.round((balance - amount) * 100) / 100 };
    }

    await Config.updateOne(
        { key: BALANCE_KEY },
        { $set: { updatedAt: new Date() }, $inc: { value: amount } }
    );

    const doc = await Config.findOne({ key: BALANCE_KEY }).lean();
    let balance = typeof doc?.value === 'number' ? doc.value : 0;
    if (!Number.isFinite(balance)) balance = 0;

    const rounded = Math.round(balance * 100) / 100;
    if (rounded !== balance) {
        await Config.updateOne(
            { key: BALANCE_KEY },
            { $set: { value: rounded, updatedAt: new Date() } }
        );
        balance = rounded;
    }

    return { balance, previous: Math.round((balance - amount) * 100) / 100 };
}

export async function getKassaBalance() {
    const config = await Config.findOne({ key: BALANCE_KEY }).lean();
    const v = config?.value;
    return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

/** Master admin üçün mütləq balans yazma */
export async function setKassaBalanceAbsolute(value) {
    const num = Math.max(0, Math.round((Number(value) || 0) * 100) / 100);
    await Config.findOneAndUpdate(
        { key: BALANCE_KEY },
        { key: BALANCE_KEY, value: num, updatedAt: new Date() },
        { upsert: true, new: true }
    );
    return num;
}

/**
 * Kassadan çəkilmə / hərəkət jurnalına əlavə et (atomik $push).
 */
export async function appendKassaWithdrawal(entry) {
    const row = {
        amount: Number(entry.amount) || 0,
        label: entry.label || 'Kassadan çəkilmə',
        date: entry.date || new Date().toISOString().slice(0, 10),
        source: entry.source || 'manual',
        type: entry.type || 'withdraw',
        withdrawalId: entry.withdrawalId || undefined,
        createdAt: new Date().toISOString(),
    };

    const existing = await Config.findOne({ key: WITHDRAWALS_KEY }).lean();
    if (!existing || !Array.isArray(existing.value)) {
        const base = Array.isArray(existing?.value) ? existing.value : [];
        await Config.findOneAndUpdate(
            { key: WITHDRAWALS_KEY },
            {
                key: WITHDRAWALS_KEY,
                value: [...base, row],
                updatedAt: new Date(),
            },
            { upsert: true }
        );
        return row;
    }

    await Config.updateOne(
        { key: WITHDRAWALS_KEY },
        {
            $set: { updatedAt: new Date() },
            $push: { value: row },
        }
    );

    return row;
}

export async function getKassaWithdrawals() {
    const config = await Config.findOne({ key: WITHDRAWALS_KEY }).lean();
    return Array.isArray(config?.value) ? config.value : [];
}

/**
 * Sahib çəkilməsini sil + məbləği kassaya qaytar (atomik).
 * employee mənbəli sətirlər bu funksiya ilə silinməməlidir.
 */
export async function reverseManualKassaWithdrawal(matcher) {
    const list = await getKassaWithdrawals();
    const idx = list.findIndex((w) => {
        if (w.source === 'employee') return false;
        if (matcher.createdAt && w.createdAt === matcher.createdAt) return true;
        if (
            matcher.date &&
            w.date === matcher.date &&
            Number(w.amount) === Number(matcher.amount) &&
            (w.label || '') === (matcher.label || '')
        ) {
            return true;
        }
        return false;
    });
    if (idx < 0) return { found: false, list, balance: await getKassaBalance() };

    const removed = list[idx];
    const next = list.filter((_, i) => i !== idx);
    await Config.findOneAndUpdate(
        { key: WITHDRAWALS_KEY },
        { key: WITHDRAWALS_KEY, value: next, updatedAt: new Date() },
        { upsert: true }
    );

    const amount = Math.abs(Number(removed.amount) || 0);
    if (amount > 0 && removed.type !== 'reversal') {
        await adjustKassa(amount, { allowNegative: true });
    }

    return { found: true, removed, list: next, balance: await getKassaBalance() };
}
