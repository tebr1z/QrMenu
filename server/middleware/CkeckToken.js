import jwt from "jsonwebtoken";
import Auth from "../model/AuthModel.js";

const CheckToken = async (req, res, next) => {
    let token = req.cookies.jwtToken;
    
    if (!token) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        }
    }
    
    if (!token) {
        return res.status(401).json({ error: "Yetkiniz yoxdur - Token tapılmadı" });
    }

    try {
        const verifyToken = jwt.verify(token, process.env.TOKEN_SECRET_CODE);
        req.user = verifyToken;

        // JWT-dəki rol köhnə ola bilər — həmişə DB-dən yoxla
        try {
            const dbUser = await Auth.findById(verifyToken.Id).select('role email name').lean();
            if (dbUser?.role) {
                req.user.Role = dbUser.role;
            }
            if (dbUser?.email) {
                req.user.Email = dbUser.email;
            }
            if (dbUser?.name) {
                req.user.Name = dbUser.name;
            }
        } catch {
            // DB əlçatan deyilsə JWT məlumatından davam et
        }

        next();
    } catch (error) {
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