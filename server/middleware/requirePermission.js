import Auth from '../model/AuthModel.js';
import { hasPermission } from '../utils/permissions.js';

const requirePermission = (page, action) => async (req, res, next) => {
    try {
        const role = req.user?.Role;
        if (role === 'master_admin') return next();

        const user = await Auth.findById(req.user.Id).select('role permissions').lean();
        if (!user) {
            return res.status(403).json({ error: 'İstifadəçi tapılmadı' });
        }

        if (!hasPermission(user, page, action)) {
            return res.status(403).json({ error: 'Bu əməliyyat üçün icazəniz yoxdur' });
        }

        next();
    } catch {
        res.status(500).json({ error: 'İcazə yoxlanışı uğursuz oldu' });
    }
};

export { requirePermission };
