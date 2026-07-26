import express from 'express';
import Config from '../model/ConfigModal.js';
import { CheckToken } from '../middleware/CkeckToken.js';
import { requireRole } from '../middleware/requireRole.js';
import {
    getKassaBalance,
    setKassaBalanceAbsolute,
    adjustKassa,
    appendKassaWithdrawal,
    getKassaWithdrawals,
    reverseManualKassaWithdrawal,
} from '../utils/kassaLedger.js';

const router = express.Router();

/** Sahib kassadan çəkir — atomik: balans − + jurnal */
router.post('/kassa/withdraw', CheckToken, requireRole('master_admin'), async (req, res) => {
    try {
        const amount = Number(req.body?.amount) || 0;
        if (amount <= 0) {
            return res.status(400).json({ error: 'Düzgün məbləğ daxil edin' });
        }
        const label = (req.body?.label || 'Kassadan çəkilmə').toString().slice(0, 120);
        const { balance } = await adjustKassa(-amount);
        const entry = await appendKassaWithdrawal({
            amount,
            label,
            date: new Date().toISOString().slice(0, 10),
            source: 'manual',
            type: 'withdraw',
        });
        res.status(200).json({ message: 'Kassadan çəkildi', balance, entry });
    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({ error: error.message || 'Çəkilmə uğursuz oldu' });
    }
});

/** Sahib çəkilməsini ləğv et — atomik */
router.post('/kassa/withdraw/reverse', CheckToken, requireRole('master_admin'), async (req, res) => {
    try {
        const result = await reverseManualKassaWithdrawal(req.body || {});
        if (!result.found) {
            return res.status(404).json({ error: 'Çəkilmə tapılmadı' });
        }
        res.status(200).json({
            message: 'Çəkilmə silindi, məbləğ kassaya qaytarıldı',
            balance: result.balance,
            list: result.list,
        });
    } catch (error) {
        res.status(500).json({ error: error.message || 'Əməliyyat uğursuz oldu' });
    }
});

// Get config by key (oxumaq — login tələb olunur)
router.get('/:key', CheckToken, async (req, res) => {
    try {
        const key = req.params.key;
        if (key === 'kassaBalance') {
            const balance = await getKassaBalance();
            return res.status(200).json({ key, value: balance });
        }
        if (key === 'kassaWithdrawals') {
            const list = await getKassaWithdrawals();
            return res.status(200).json({ key, value: list });
        }

        const config = await Config.findOne({ key }).lean();
        if (!config) {
            return res.status(200).json({ key, value: null });
        }
        res.status(200).json({ key: config.key, value: config.value });
    } catch (error) {
        res.status(500).json({ error: 'Ayarlar alınarkən xəta baş verdi' });
    }
});

/**
 * Kassa / həssas ayarlar — yalnız master_admin.
 * Digər açarlar (məs. extraConsolePrice) — autentifikasiyalı user.
 */
router.put('/:key', CheckToken, async (req, res) => {
    try {
        const key = req.params.key;
        const { value } = req.body;
        if (value === undefined) {
            return res.status(400).json({ error: 'Dəyər tələb olunur' });
        }

        const moneyKeys = ['kassaBalance', 'kassaWithdrawals'];
        if (moneyKeys.includes(key)) {
            if (req.user?.Role !== 'master_admin') {
                return res.status(403).json({ error: 'Kassa dəyişikliyi yalnız Master Admin üçündür' });
            }
        }

        if (key === 'kassaBalance') {
            const balance = await setKassaBalanceAbsolute(value);
            return res.status(200).json({ message: 'Kassa balansı yeniləndi', key, value: balance });
        }

        if (key === 'kassaWithdrawals') {
            // Köhnə client tam list göndərə bilər — yalnız master
            const list = Array.isArray(value) ? value : [];
            await Config.findOneAndUpdate(
                { key },
                { key, value: list, updatedAt: new Date() },
                { upsert: true, new: true }
            );
            return res.status(200).json({ message: 'Ayar yeniləndi', key, value: list });
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
