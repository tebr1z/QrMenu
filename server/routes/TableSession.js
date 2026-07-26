import express from 'express';
import TableSession from '../model/TableSessionModal.js';
import Order from '../model/OrderModal.js';
import { CheckToken } from '../middleware/CkeckToken.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { applyStockDeductionForOrder } from '../utils/stockDeduction.js';
import { ensureSessionIntegrity } from '../utils/ensureSessionIntegrity.js';
import { adjustKassa } from '../utils/kassaLedger.js';

const router = express.Router();

/** Eyni masa üçün eyni anda yalnız bir Start (proses daxili kilid) */
const startingLocks = new Set();

/** Menyu cəmini session qiymətlərindən hesabla (client total-a etibar etmə) */
function computeMenuTotal(selectedMenu, productDiscounts = {}) {
    if (!Array.isArray(selectedMenu)) return 0;
    return selectedMenu.reduce((sum, item) => {
        const quantity = Math.max(1, Number(item.quantity) || 1);
        const productId = item._id || item.id;
        const discount = Number(productDiscounts[productId]) || 0;
        const price = Number(item.price) || 0;
        const discounted = price - (price * discount) / 100;
        return sum + discounted * quantity;
    }, 0);
}

/** Eyni masa üçün birdən çox aktiv session qalıbsa — ən yenisini saxla */
function dedupeSessionsByTable(sessions) {
    const best = new Map();
    for (const s of sessions) {
        const key = String(s.tableId);
        const prev = best.get(key);
        if (!prev || (Number(s.startTime) || 0) > (Number(prev.startTime) || 0)) {
            best.set(key, s);
        }
    }
    return Array.from(best.values());
}

// Bütün aktiv session-ları al (masa başına yalnız 1)
router.get('/Active', CheckToken, requirePermission('TableManage', 'view'), async (req, res) => {
    try {
        const sessions = await TableSession.find({ isActive: true })
            .select("tableId tableName startTime hourlyPrice selectedMenu timer isActive selectedSet setFreeMinutes selectedHours countdownStarted countdownStartTime psType selectedFreeMinutes psHistory createdAt")
            .lean();

        const unique = dedupeSessionsByTable(sessions);

        // Ghost session-ları arxa planda təmizlə
        if (unique.length < sessions.length) {
            const keepIds = new Set(unique.map((s) => String(s._id)));
            const ghostIds = sessions
                .filter((s) => !keepIds.has(String(s._id)))
                .map((s) => s._id);
            if (ghostIds.length) {
                TableSession.deleteMany({ _id: { $in: ghostIds } }).catch(() => {});
            }
        }

        res.status(200).json(unique);
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error('Active sessions error:', error);
        }
        res.status(500).json({ error: 'Aktiv masalar alınarkən xəta baş verdi' });
    }
});

/** Manual / admin: dublikat və orphan session təmizliyi */
router.post('/Repair', CheckToken, requirePermission('TableManage', 'view'), async (_req, res) => {
    try {
        const summary = await ensureSessionIntegrity();
        const sessions = await TableSession.find({ isActive: true }).lean();
        res.status(200).json({
            message: 'Session təmizliyi tamamlandı',
            summary,
            activeCount: sessions.length,
            sessions: dedupeSessionsByTable(sessions),
        });
    } catch (error) {
        res.status(500).json({ error: 'Session təmizliyi uğursuz oldu' });
    }
});

// Yeni session başlat — eyni masa üçün ikinci aktiv session yoxdur
router.post('/Start', CheckToken, requirePermission('TableManage', 'edit'), async (req, res) => {
    const tableId = String(req.body?.tableId || '');
    if (!tableId) {
        return res.status(400).json({ error: 'tableId tələb olunur' });
    }

    if (startingLocks.has(tableId)) {
        const existing = await TableSession.findOne({ tableId, isActive: true });
        if (existing) {
            return res.status(409).json({ error: 'Bu masa artıq açıqdır', session: existing });
        }
        return res.status(429).json({ error: 'Masa açılır, bir an gözləyin' });
    }

    startingLocks.add(tableId);
    try {
        const existingList = await TableSession.find({ tableId, isActive: true }).sort({ startTime: -1 });
        if (existingList.length > 0) {
            const primary = existingList[0];
            if (existingList.length > 1) {
                await TableSession.deleteMany({
                    tableId,
                    _id: { $ne: primary._id },
                });
            }
            return res.status(409).json({
                error: 'Bu masa artıq açıqdır',
                session: primary,
            });
        }

        await TableSession.deleteMany({ tableId, isActive: { $ne: true } });

        const session = new TableSession({
            ...req.body,
            tableId,
            isActive: true,
        });
        await session.save();
        res.status(201).json({ message: 'Masa başlatıldı', session });
    } catch (error) {
        if (error?.code === 11000) {
            const existing = await TableSession.findOne({ tableId, isActive: true });
            if (existing) {
                return res.status(409).json({
                    error: 'Bu masa artıq açıqdır',
                    session: existing,
                });
            }
        }
        if (process.env.NODE_ENV === 'development') {
            console.error('Start session error:', error);
        }
        res.status(500).json({ error: 'Masa başlatılarkən xəta baş verdi' });
    } finally {
        startingLocks.delete(tableId);
    }
});

// Session-a menyu əlavə et
router.put('/:id/menu', CheckToken, requirePermission('TableManage', 'edit'), async (req, res) => {
    try {
        const { selectedMenu } = req.body;
        const session = await TableSession.findByIdAndUpdate(
            req.params.id,
            { selectedMenu },
            { new: true }
        );
        if (!session) return res.status(404).json({ error: 'Session tapılmadı' });
        res.status(200).json({ message: 'Menyu yeniləndi', session });
    } catch (error) {
        res.status(500).json({ error: 'Menyu yenilənərkən xəta baş verdi' });
    }
});

// Timer-i yenilə
router.put('/:id/timer', CheckToken, requirePermission('TableManage', 'edit'), async (req, res) => {
    try {
        const { timer } = req.body;
        const session = await TableSession.findByIdAndUpdate(
            req.params.id,
            { timer },
            { new: true }
        );
        if (!session) return res.status(404).json({ error: 'Session tapılmadı' });
        res.status(200).json({ message: 'Timer yeniləndi', session });
    } catch (error) {
        res.status(500).json({ error: 'Timer yenilənərkən xəta baş verdi' });
    }
});

// Session-u yenilə (set və saat seçimi üçün)
router.put('/:id/update', CheckToken, requirePermission('TableManage', 'edit'), async (req, res) => {
    try {
        const { selectedSet, setFreeMinutes, selectedHours, countdownStarted, countdownStartTime, psType, hourlyPrice } = req.body;
        const updateData = {};
        if (selectedSet !== undefined) updateData.selectedSet = selectedSet;
        if (setFreeMinutes !== undefined) updateData.setFreeMinutes = setFreeMinutes;
        if (selectedHours !== undefined) updateData.selectedHours = selectedHours;
        if (countdownStarted !== undefined) updateData.countdownStarted = countdownStarted;
        if (countdownStartTime !== undefined) updateData.countdownStartTime = countdownStartTime;
        if (psType !== undefined) updateData.psType = psType;
        if (hourlyPrice !== undefined) updateData.hourlyPrice = hourlyPrice;
        
        const session = await TableSession.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );
        if (!session) return res.status(404).json({ error: 'Session tapılmadı' });
        res.status(200).json({ message: 'Session yeniləndi', session });
    } catch (error) {
        res.status(500).json({ error: 'Session yenilənərkən xəta baş verdi' });
    }
});

// PS növünü dəyişdir
router.put('/:id/changePS', CheckToken, requirePermission('TableManage', 'edit'), async (req, res) => {
    try {
        const { psType, hourlyPrice } = req.body;
        const session = await TableSession.findById(req.params.id);
        if (!session) return res.status(404).json({ error: 'Session tapılmadı' });
        
        const now = Date.now();
        
        if (session.psHistory && session.psHistory.length > 0) {
            const lastPS = session.psHistory[session.psHistory.length - 1];
            if (!lastPS.endTime) {
                lastPS.endTime = now;
            }
        }
        
        const newPSHistory = {
            psType: psType,
            hourlyPrice: hourlyPrice,
            startTime: now,
            endTime: null
        };
        
        session.psHistory = session.psHistory || [];
        session.psHistory.push(newPSHistory);
        session.psType = psType;
        session.hourlyPrice = hourlyPrice;
        
        await session.save();
        res.status(200).json({ message: 'PS növü dəyişdirildi', session });
    } catch (error) {
        res.status(500).json({ error: 'PS növü dəyişdirilərkən xəta baş verdi' });
    }
});

/**
 * Atomik bitirmə: bir masa üçün BÜTÜN session-lar bağlanır + bir sifariş.
 */
router.post('/:id/finish', CheckToken, requirePermission('TableManage', 'edit'), async (req, res) => {
    const sessionId = String(req.params.id);

    try {
        const existingOrder = await Order.findOne({
            $or: [
                { sessionId },
                ...(req.body?.startTime != null && req.body?.tableId != null
                    ? [{ tableId: String(req.body.tableId), startTime: Number(req.body.startTime) }]
                    : []),
            ],
        });

        // Session-u tap (isActive olmasa belə)
        let session = null;
        try {
            session = await TableSession.findById(sessionId);
        } catch {
            session = null;
        }

        const tableId = session
            ? String(session.tableId)
            : (req.body?.tableId != null ? String(req.body.tableId) : null);

        if (existingOrder) {
            // Sifariş artıq var — masanın bütün session-larını sil
            if (tableId) await TableSession.deleteMany({ tableId });
            await TableSession.findByIdAndDelete(sessionId).catch(() => {});
            return res.status(200).json({
                message: 'Bu masa artıq bitirilib',
                order: existingOrder,
                alreadyFinished: true,
                lowStockAlerts: [],
            });
        }

        if (!session) {
            // Session yoxdur amma eyni masa+start üçün order ola bilər
            if (tableId) await TableSession.deleteMany({ tableId });
            return res.status(404).json({ error: 'Session tapılmadı və ya artıq bitirilib' });
        }

        // Bu masanın bütün session-larını dərhal bağla (ghost qalmasın)
        await TableSession.updateMany(
            { tableId: String(session.tableId) },
            { $set: { isActive: false } }
        );

        const endTime = Number(req.body?.endTime) || Date.now();
        const selectedMenu = Array.isArray(session.selectedMenu) && session.selectedMenu.length
            ? session.selectedMenu
            : (Array.isArray(req.body?.selectedMenu) ? req.body.selectedMenu : []);
        const productDiscounts = req.body?.productDiscounts || {};
        const menuTotal = Math.round(computeMenuTotal(selectedMenu, productDiscounts) * 100) / 100;
        const hourTotal = Math.max(0, Number(req.body?.hourTotal) || 0);
        const psPriceDifference = Math.max(0, Number(req.body?.psPriceDifference) || 0);
        // Kassaya düşən məbləğ serverdə yenidən hesablanır (client total-ına etibar yox)
        const total = Math.round((hourTotal + menuTotal) * 100) / 100;
        const durationMinutes = Math.max(
            1,
            Number(req.body?.durationMinutes) ||
            Math.round((endTime - session.startTime) / (1000 * 60))
        );

        const orderPayload = {
            sessionId,
            tableId: String(session.tableId),
            tableName: session.tableName || req.body?.tableName || '',
            startTime: session.startTime,
            endTime,
            durationMinutes,
            hourlyPrice: Number(req.body?.hourlyPrice) || Number(session.hourlyPrice) || 0,
            hourTotal,
            selectedMenu,
            menuTotal,
            total,
            freeInfo: req.body?.freeInfo || '',
            orderId: req.body?.orderId || `session_${sessionId}`,
            psType: req.body?.psType || session.psType || null,
            psPriceDifference,
            psHistory: Array.isArray(req.body?.psHistory) ? req.body.psHistory : (session.psHistory || []),
            productDiscounts,
        };

        let order;
        try {
            order = new Order(orderPayload);
            await order.save();
        } catch (saveErr) {
            if (saveErr?.code === 11000) {
                const dup = await Order.findOne({
                    $or: [
                        { sessionId },
                        { orderId: orderPayload.orderId },
                        { tableId: orderPayload.tableId, startTime: orderPayload.startTime },
                    ],
                });
                await TableSession.deleteMany({ tableId: String(session.tableId) });
                return res.status(200).json({
                    message: 'Bu masa artıq bitirilib',
                    order: dup,
                    alreadyFinished: true,
                    lowStockAlerts: [],
                });
            }
            // Order yazılmadı — session-ları yenidən aktiv et (yalnız əsas)
            await TableSession.findByIdAndUpdate(sessionId, { $set: { isActive: true } }).catch(() => {});
            throw saveErr;
        }

        // Uğurlu sifariş — bu masanın BÜTÜN session-larını sil
        await TableSession.deleteMany({ tableId: String(session.tableId) });
        await TableSession.findByIdAndDelete(sessionId).catch(() => {});

        const orderTotal = Number(order.total) || 0;
        if (orderTotal > 0) {
            try {
                await adjustKassa(orderTotal, { allowNegative: true });
            } catch (kassaErr) {
                console.error('[finish] KASSA YAZILMADI — sifariş var:', order._id, kassaErr);
                // Sifariş artıq var; kassanı sonra düzəltmək üçün işarələ
                await Order.findByIdAndUpdate(order._id, { $set: { kassaPending: true } }).catch(() => {});
            }
        }

        let lowStockAlerts = [];
        if (order.selectedMenu?.length) {
            try {
                lowStockAlerts = await applyStockDeductionForOrder(order.selectedMenu);
            } catch (stockErr) {
                if (process.env.NODE_ENV === 'development') {
                    console.error('[finish] stock deduction error:', stockErr);
                }
            }
        }

        res.status(201).json({
            message: 'Masa bitirildi',
            order,
            alreadyFinished: false,
            lowStockAlerts,
        });
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error('Finish session error:', error);
        }
        res.status(500).json({ error: 'Session bitirilərkən xəta baş verdi' });
    }
});

// Session-u bitir və sil — eyni masanın hamısını sil
router.delete('/:id', CheckToken, requirePermission('TableManage', 'edit'), async (req, res) => {
    try {
        const session = await TableSession.findById(req.params.id);
        if (!session) return res.status(404).json({ error: 'Session tapılmadı' });
        await TableSession.deleteMany({ tableId: String(session.tableId) });
        res.status(200).json({ message: 'Session bitirildi və silindi', session });
    } catch (error) {
        res.status(500).json({ error: 'Session silinərkən xəta baş verdi' });
    }
});

export default router;
