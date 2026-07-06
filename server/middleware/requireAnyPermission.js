import Auth from '../model/AuthModel.js';
import { hasPermission, isMasterAdmin } from '../utils/permissions.js';

const requireAnyPermission = (page, ...actions) => async (req, res, next) => {
    try {
        if (isMasterAdmin(req.user?.Role)) return next();

        const user = await Auth.findById(req.user.Id).select('role permissions').lean();
        if (!user) {
            return res.status(403).json({ error: 'İstifadəçi tapılmadı' });
        }

        const allowed = actions.some((action) => hasPermission(user, page, action));
        if (!allowed) {
            return res.status(403).json({ error: 'Bu əməliyyat üçün icazəniz yoxdur' });
        }

        next();
    } catch {
        res.status(500).json({ error: 'İcazə yoxlanışı uğursuz oldu' });
    }
};

export { requireAnyPermission };
