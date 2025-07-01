import express from 'express';
import Auth from "../model/AuthModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const router = express.Router();

router.post("/Register", async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        // return res.status(422).json({ error: "Please fill all the fields" })
        return res.status(422).json({ error: "Zəhmət olmasa bütün xanaları doldurun" });
    }

    try {
        const findUser = await Auth.findOne({
            email: email
        })
        if (findUser) {
            return res.status(422).json({ error: "E-poçt artıq mövcuddur" });
        }

        const HashedPassword = await bcrypt.hash(password, 10);
        const user = new Auth({
            name,
            email,
            password: HashedPassword
        })

        await user.save();
        // res.status(201).json({ message: "User registered successfully" })
        res.status(201).json({ message: "İstifadəçi uğurla qeydiyyatdan keçdi" })
    } catch (error) {
        console.log(error)
    }

});

router.post("/Login", async (req, res) => {
    const { email, password } = req.body;
    try {

        if (!email || !password) {
            // return res.status(400).json({error:"Please fill all the fields"})
            return res.status(400).json({ error: "Zəhmət olmasa bütün xanaları doldurun" })
        }

        const userLogin = await Auth.findOne({ email: email });
        if (!userLogin) {
            // return res.status(401).json({error:"User not found"})
            return res.status(401).json({ error: "İstifadəçi tapılmadı" })
        }

        const isMatch = await bcrypt.compare(password, userLogin.password);
        if (!isMatch) {
            // return res.status(401).json({error:"Incorrect password"})
            return res.status(401).json({ error: "Sifre yanlışdır" })
        }

        const payload = {
            Id: userLogin.id,
            Name: userLogin.name,
        }

        const token = jwt.sign(payload, process.env.TOKEN_SECRET_CODE, {
            expiresIn: "3d",
        });
        res.cookie("jwtToken", token, {
            // httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24 * 7,
        });

        // res.json({message:"User Signin Successfully"})
        res.json({ message: "İstifadəçi uğurla daxil oldu", payload })

    } catch (error) {
        console.log(error)
    }
})

router.post("/Logout", async (req, res) => {
    const token = req.cookies.jwtToken;

    try {
        if (!token) {
            res.status(400).json({ message: "profile not sigin" });
            return;
        }
        res.clearCookie("jwtToken", {
            httpOnly: true,
            secure: true,
            sameSite: "strict",
        });

        // res.clearCookie("jwtToken", {
        //   domain: ".nabi.net.tr",  // Cookie'nin geçerli olduğu domain
        //   httpOnly: true,
        //   secure: true,
        //   sameSite: "Strict",  // Aynı site isteği dışında erişimi kısıtlar
        // });


        //   res.status(200).json({ message: "Profile has been logged out" });
        res.status(200).json({ message: "Profil çıxış etdi" });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
});




export default router;