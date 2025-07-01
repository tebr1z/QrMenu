import express from "express";
import WebAboutModal from "../model/WebAboutModal.js";
import { CheckToken } from "../middleware/CkeckToken.js";
import mongoose from "mongoose";
const router = express.Router()

router.get("/", async (req, res) => {
    try {
        const respons = await WebAboutModal.find()
        res.json(respons)
    } catch (error) {
        console.log(error)
    }
})

router.use(CheckToken)
router.post("/", async (req, res) => {
    try {

        const existingData = await WebAboutModal.findOne();
        if (existingData) {
            return res.status(400).json({
                message: "Artıq əlaqə məlumatları mövcuddur."
            });
        }

        const respons = new WebAboutModal(req.body);
        const savedData = await respons.save();
        res.status(201).json(savedData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put("/update/:id", async (req, res) => {
    const { id } = req.params;
    const { wifiName, wifiPassword, location, phone, day } = req.body;

    if (!id) {
        return res.status(400).json({ error: "Kontakt məlumatları tapılmadı. Zəhmət olmasa yeni kontakt yaradın." });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Yanlış ID formatıdır." });
    }

    try {
        const updatedData = {
            wifiName: wifiName?.trim() || "Wifi Name",
            wifiPassword: wifiPassword?.trim() || "Wifi Password",
            location: location?.trim() || "Location",
            phone: phone?.trim() || "Phone Number",
            day: day?.length ? day : [
                { name: "Bazar ertəsi", openingTime: "08:00", closingTime: "20:00" },
                { name: "Çərşənbə axşamı", openingTime: "08:00", closingTime: "20:00" },
                { name: "Çərşənbə", openingTime: "08:00", closingTime: "20:00" },
                { name: "Cümə axşamı", openingTime: "08:00", closingTime: "20:00" },
                { name: "Cümə", openingTime: "08:00", closingTime: "22:00" },
                { name: "Şənbə", openingTime: "09:00", closingTime: "22:00" },
                { name: "Bazar", openingTime: "09:00", closingTime: "18:00" }
            ]
        };

        const webAbout = await WebAboutModal.findByIdAndUpdate(
            { _id: id },
            { $set: updatedData },
            { new: true }
        );

        if (!webAbout) {
            return res.status(404).json({ error: "Məlumat tapılmadı." });
        }

        res.status(200).json({ message: "Məlumatlar yeniləndi.", webAbout });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});


export default router