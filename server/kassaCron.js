import cron from 'node-cron';
import Order from './model/OrderModal.js';
import Config from './model/ConfigModal.js';

function getYesterdayDateStr() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/**
 * Köhnə cron: sifarişləri gecə kassaya YENİDƏN əlavə edirdi → ikiqat sayım.
 * İndi pul Bitir anında atomik yazılır; bu funksiya yalnız log üçün qalıb.
 */
export async function runKassaDailyOnce() {
    try {
        const yesterday = getYesterdayDateStr();
        const lastRun = await Config.findOne({ key: 'lastKassaUpdate' }).lean();
        if (lastRun && lastRun.value === yesterday) {
            return;
        }

        const start = new Date(yesterday);
        const end = new Date(yesterday);
        end.setDate(end.getDate() + 1);

        const orders = await Order.find({
            createdAt: { $gte: start, $lt: end },
        }).lean();
        const orderSum = orders.reduce((s, o) => s + (Number(o.total) || 0), 0);

        await Config.findOneAndUpdate(
            { key: 'lastKassaUpdate' },
            { key: 'lastKassaUpdate', value: yesterday, updatedAt: new Date() },
            { upsert: true, new: true }
        );
        console.log(`[Kassa] ${yesterday} sifariş cəmi (məlumat): ${orderSum.toFixed(2)}₼ — balans Bitir ilə yenilənir, cron əlavə etmir`);
    } catch (err) {
        console.error('[Kassa] Gecə 03:00 job xətası:', err);
    }
}

export function startKassaCron() {
    cron.schedule('0 3 * * *', async () => {
        await runKassaDailyOnce();
    }, { timezone: undefined });
    console.log('Kassa cron: hər gecə 03:00-da gəlir kassaya əlavə olunacaq.');
}
