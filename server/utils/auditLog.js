import AuditLog from '../model/AuditLogModal.js';

export async function logAudit(req, {
    action,
    resource,
    resourceId = '',
    summary,
    details = null,
}) {
    try {
        const user = req.user || {};
        await AuditLog.create({
            userId: user.Id || user.id || 'system',
            userName: user.Name || user.name || 'Sistem',
            userEmail: user.Email || user.email || '',
            action,
            resource,
            resourceId: resourceId ? String(resourceId) : '',
            summary: String(summary).slice(0, 500),
            details,
        });
    } catch (err) {
        console.error('Audit log yazılmadı:', err.message);
    }
}
