import jwt from "jsonwebtoken";

const CheckToken = async (req, res, next) => {
    const token = req.cookies.jwtToken;
    if (!token) {
        return res.status(403).json({ error: "Yetkiniz yoxdur" });
    }

    try {
        const verifyToken = jwt.verify(token, process.env.TOKEN_SECRET_CODE);
        req.user = verifyToken;
        next();
    } catch (error) {

        if (error.name === "TokenExpiredError") {
            res.clearCookie("jwtToken", {
                httpOnly: true,
                secure: true,
                sameSite: "strict",
            });
            res.status(403).json({ message: "Icazə vaxtı bitdi, yenidən giriş edin" });
            return
        }

        res.clearCookie("jwtToken", {
            httpOnly: true,
            secure: true,
            sameSite: "strict",
        });
        res.status(403).json({ message: "Internal Server Error" });
    }

}

export { CheckToken };