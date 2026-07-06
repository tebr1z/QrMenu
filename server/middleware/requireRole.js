const requireRole = (...allowedRoles) => (req, res, next) => {
    const role = req.user?.Role;
    if (!role || !allowedRoles.includes(role)) {
        return res.status(403).json({ error: 'Bu əməliyyat üçün yetkiniz yoxdur' });
    }
    next();
};

export { requireRole };
