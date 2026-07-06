import express from 'express';
import AuditLog from '../model/AuditLogModal.js';
import { CheckToken } from '../middleware/CkeckToken.js';
import { requireRole } from '../middleware/requireRole.js';
import { logAudit } from '../utils/auditLog.js';

const router = express.Router();

const ACTIVITY_RESOURCES = ['TableManage', 'Order', 'EmployeePayroll'];

router.get('/', CheckToken, requireRole('master_admin'), async (req, res) => {
    try {
        const limit = Math.min(Number(req.query.limit) || 300, 500);
        const query = {};

        if (req.query.resource) {
            query.resource = req.query.resource;
        } else if (req.query.mode === 'activity' || !req.query.all) {
            query.resource = { $in: ACTIVITY_RESOURCES };
        }

        if (req.query.userId) query.userId = req.query.userId;

        const logs = await AuditLog.find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        res.json(logs);
    } catch {
        res.status(500).json({ error: 'Jurnal yüklənmədi' });
    }
});

router.post('/activity', CheckToken, async (req, res) => {
    try {
        const { summary, details, resource = 'TableManage' } = req.body;
        if (!summary || !String(summary).trim()) {
            return res.status(400).json({ error: 'Təsvir tələb olunur' });
        }

        await logAudit(req, {
            action: 'activity',
            resource,
            summary: String(summary).trim(),
            details: details || null,
        });

        res.status(201).json({ message: 'Fəaliyyət qeyd olundu' });
    } catch {
        res.status(500).json({ error: 'Fəaliyyət qeyd olunmadı' });
    }
});

export default router;
