import express from 'express';
import Auth from "../model/AuthModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { CheckToken } from "../middleware/CkeckToken.js";
import { requireRole } from "../middleware/requireRole.js";
import {
    normalizePermissions,
    isMasterAdmin,
    emptyPermissions,
} from "../utils/permissions.js";
import { logAudit } from "../utils/auditLog.js";

const router = express.Router();

const VALID_ROLES = ['master_admin', 'staff', 'kassa', 'novbe'];

async function resolveUserRole(user) {
    if (user.role && VALID_ROLES.includes(user.role)) {
        return user.role;
    }
    const count = await Auth.countDocuments();
    if (count <= 1) {
        user.role = 'master_admin';
        user.permissions = emptyPermissions();
        await user.save();
        return 'master_admin';
    }
    const masterEmail = process.env.MASTER_ADMIN_EMAIL;
    if (masterEmail && user.email === masterEmail) {
        user.role = 'master_admin';
        await user.save();
        return 'master_admin';
    }
    user.role = 'staff';
    await user.save();
    return 'staff';
}

function buildTokenPayload(user, role) {
    return {
        Id: user._id.toString(),
        Name: user.name,
        Email: user.email,
        Username: user.username || '',
        Role: role,
    };
}

function sanitizeUser(user) {
    return {
        _id: user._id,
        name: user.name,
        username: user.username || '',
        email: user.email,
        role: user.role,
        permissions: normalizePermissions(user.permissions),
    };
}

router.post("/Register", CheckToken, requireRole('master_admin'), async (req, res) => {
    const { name, username, email, password, role, permissions } = req.body;

    if (!name || !email || !password) {
        return res.status(422).json({ error: "Zəhmət olmasa bütün xanaları doldurun" });
    }

    const userRole = role === 'master_admin' ? 'staff' : 'staff';

    try {
        const findUser = await Auth.findOne({ email: email.toLowerCase().trim() });
        if (findUser) {
            return res.status(422).json({ error: "E-poçt artıq mövcuddur" });
        }
        if (username) {
            const dup = await Auth.findOne({ username: String(username).trim().toLowerCase() });
            if (dup) return res.status(422).json({ error: 'İstifadəçi adı artıq mövcuddur' });
        }

        const HashedPassword = await bcrypt.hash(password, 10);
        const user = new Auth({
            name: String(name).trim(),
            username: username ? String(username).trim().toLowerCase() : undefined,
            email: email.toLowerCase().trim(),
            password: HashedPassword,
            role: userRole,
            permissions: normalizePermissions(permissions),
        });

        await user.save();
        await logAudit(req, {
            action: 'create',
            resource: 'Users',
            resourceId: user._id,
            summary: `Yeni istifadəçi yaradıldı: ${user.name}`,
        });
        res.status(201).json({
            message: "İstifadəçi uğurla yaradıldı",
            user: sanitizeUser(user),
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Qeydiyyat zamanı xəta baş verdi" });
    }
});

router.post("/Login", async (req, res) => {
    const { email, password, username, login } = req.body;
    try {
        const loginId = (login || username || email || '').toString().trim().toLowerCase();
        if (!loginId || !password) {
            return res.status(400).json({ error: "İstifadəçi adı/e-poçt və şifrə daxil edin" });
        }

        const userLogin = await Auth.findOne({
            $or: [{ email: loginId }, { username: loginId }],
        });
        if (!userLogin) {
            return res.status(401).json({ error: "İstifadəçi tapılmadı" });
        }

        const isMatch = await bcrypt.compare(password, userLogin.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Sifre yanlışdır" });
        }

        const role = await resolveUserRole(userLogin);
        const payload = buildTokenPayload(userLogin, role);
        const permissions = isMasterAdmin(role)
            ? emptyPermissions()
            : normalizePermissions(userLogin.permissions);

        const token = jwt.sign(payload, process.env.TOKEN_SECRET_CODE, {
            expiresIn: "24h",
        });
        res.cookie("jwtToken", token, {
            httpOnly: false,
            secure: false,
            sameSite: 'lax',
            maxAge: 1000 * 60 * 60 * 24,
            path: '/'
        });

        await logAudit({ user: payload }, {
            action: 'login',
            resource: 'Auth',
            resourceId: userLogin._id,
            summary: `${userLogin.name} daxil oldu`,
        });

        res.json({
            message: "İstifadəçi uğurla daxil oldu",
            payload: { ...payload, permissions },
            token,
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Giriş zamanı xəta baş verdi" });
    }
});

router.post("/Logout", async (req, res) => {
    try {
        res.clearCookie("jwtToken", {
            httpOnly: false,
            secure: false,
            sameSite: 'lax',
            path: '/'
        });
        res.status(200).json({ message: "Profil çıxış etdi" });
    } catch (error) {
        console.log('Logout error:', error);
        return res.status(500).json({ message: "Internal server error" });
    }
});

router.get("/Me", CheckToken, async (req, res) => {
    try {
        const user = await Auth.findById(req.user.Id).select('-password').lean();
        if (!user) return res.status(404).json({ error: 'İstifadəçi tapılmadı' });
        const role = user.role || req.user.Role || 'staff';
        res.json({
            ...sanitizeUser({ ...user, role }),
            permissions: isMasterAdmin(role)
                ? emptyPermissions()
                : normalizePermissions(user.permissions),
        });
    } catch (error) {
        res.status(500).json({ error: 'İstifadəçi məlumatı alınmadı' });
    }
});

router.get("/users", CheckToken, requireRole('master_admin'), async (req, res) => {
    try {
        const users = await Auth.find().select('-password').sort({ name: 1 }).lean();
        res.json(users.map((u) => sanitizeUser(u)));
    } catch (error) {
        res.status(500).json({ error: 'İstifadəçilər alınmadı' });
    }
});

router.post("/users", CheckToken, requireRole('master_admin'), async (req, res) => {
    const { name, username, email, password, permissions } = req.body;
    if (!name || !email || !password) {
        return res.status(422).json({ error: 'Ad, e-poçt və şifrə tələb olunur' });
    }
    try {
        const exists = await Auth.findOne({ email: email.toLowerCase().trim() });
        if (exists) return res.status(422).json({ error: 'E-poçt artıq mövcuddur' });
        if (username) {
            const dup = await Auth.findOne({ username: String(username).trim().toLowerCase() });
            if (dup) return res.status(422).json({ error: 'İstifadəçi adı artıq mövcuddur' });
        }

        const user = new Auth({
            name: String(name).trim(),
            username: username ? String(username).trim().toLowerCase() : undefined,
            email: email.toLowerCase().trim(),
            password: await bcrypt.hash(password, 10),
            role: 'staff',
            permissions: normalizePermissions(permissions),
        });
        await user.save();
        await logAudit(req, {
            action: 'create',
            resource: 'Users',
            resourceId: user._id,
            summary: `İstifadəçi yaradıldı: ${user.name}`,
            details: { permissions: user.permissions },
        });
        res.status(201).json({
            message: 'Hesab yaradıldı',
            user: sanitizeUser(user),
        });
    } catch (error) {
        res.status(500).json({ error: 'Hesab yaradılarkən xəta' });
    }
});

router.put("/users/:id", CheckToken, requireRole('master_admin'), async (req, res) => {
    const { name, username, email, password, permissions } = req.body;
    try {
        const user = await Auth.findById(req.params.id);
        if (!user) return res.status(404).json({ error: 'İstifadəçi tapılmadı' });

        if (user.role === 'master_admin') {
            if (name) user.name = String(name).trim();
            if (email) user.email = email.toLowerCase().trim();
            if (password) user.password = await bcrypt.hash(password, 10);
        } else {
            if (name) user.name = String(name).trim();
            if (username) {
                const dup = await Auth.findOne({
                    username: String(username).trim().toLowerCase(),
                    _id: { $ne: user._id },
                });
                if (dup) return res.status(422).json({ error: 'İstifadəçi adı artıq mövcuddur' });
                user.username = String(username).trim().toLowerCase();
            }
            if (email) user.email = email.toLowerCase().trim();
            if (password) user.password = await bcrypt.hash(password, 10);
            if (permissions) user.permissions = normalizePermissions(permissions);
        }

        await user.save();
        await logAudit(req, {
            action: 'update',
            resource: 'Users',
            resourceId: user._id,
            summary: `İstifadəçi yeniləndi: ${user.name}`,
            details: { permissions: user.permissions },
        });
        res.json(sanitizeUser(user));
    } catch (error) {
        res.status(500).json({ error: 'İstifadəçi yenilənərkən xəta' });
    }
});

router.delete("/users/:id", CheckToken, requireRole('master_admin'), async (req, res) => {
    try {
        const user = await Auth.findById(req.params.id);
        if (!user) return res.status(404).json({ error: 'İstifadəçi tapılmadı' });
        if (user._id.toString() === req.user.Id) {
            return res.status(400).json({ error: 'Öz hesabınızı silə bilməzsiniz' });
        }
        if (user.role === 'master_admin') {
            return res.status(400).json({ error: 'Master admin silinə bilməz' });
        }
        await Auth.findByIdAndDelete(req.params.id);
        await logAudit(req, {
            action: 'delete',
            resource: 'Users',
            resourceId: user._id,
            summary: `İstifadəçi silindi: ${user.name}`,
        });
        res.json({ message: 'İstifadəçi silindi' });
    } catch (error) {
        res.status(500).json({ error: 'İstifadəçi silinərkən xəta' });
    }
});

export default router;
