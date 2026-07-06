import jwt from 'jsonwebtoken';

const verifyEmployeeToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'İşçi girişi tələb olunur' });
    }

    try {
        const token = authHeader.substring(7);
        const payload = jwt.verify(token, process.env.TOKEN_SECRET_CODE);
        if (payload.type !== 'employee' || !payload.employeeId) {
            return res.status(401).json({ error: 'Etibarsız işçi sessiyası' });
        }
        req.employee = payload;
        next();
    } catch {
        return res.status(401).json({ error: 'İşçi sessiyası bitib' });
    }
};

export { verifyEmployeeToken };
