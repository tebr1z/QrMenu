import jwt from "jsonwebtoken";

const CheckToken = async (req, res, next) => {
    // Check for token in cookies first, then in Authorization header
    let token = req.cookies.jwtToken;
    
    if (!token) {
        // Check Authorization header
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        }
    }
    
    if (!token) {
        console.log('No token found in cookies or Authorization header');
        console.log('Cookies:', req.cookies);
        console.log('Authorization header:', req.headers.authorization);
        return res.status(401).json({ error: "Yetkiniz yoxdur - Token tapılmadı" });
    }

    try {
        const verifyToken = jwt.verify(token, process.env.TOKEN_SECRET_CODE);
        req.user = verifyToken;
        next();
    } catch (error) {
        console.log('Token verification error:', error.name, error.message);

        if (error.name === "TokenExpiredError") {
            res.clearCookie("jwtToken", {
                httpOnly: false,
                secure: false,
                sameSite: 'lax',
                path: '/'
            });
            res.status(401).json({ error: "Icazə vaxtı bitdi, yenidən giriş edin" });
            return
        }

        res.clearCookie("jwtToken", {
            httpOnly: false,
            secure: false,
            sameSite: 'lax',
            path: '/'
        });
        res.status(401).json({ error: "Etibarsız token" });
    }
}

export { CheckToken };