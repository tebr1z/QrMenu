import express from "express";
import FeedbackModal from "../model/FeedbackModal.js";
import { CheckToken } from "../middleware/CkeckToken.js";

const router = express.Router();

// Müştərilər feedback göndərə bilər (token tələb olunmur)
router.post("/", async (req, res) => {
    try {
        const { foodRating, cleanlinessRating, staffRating, message } = req.body;

        // Validation
        if (!foodRating || !cleanlinessRating || !staffRating) {
            return res.status(400).json({ error: "Bütün reytinqlər tələb olunur" });
        }

        if (foodRating < 1 || foodRating > 5 || 
            cleanlinessRating < 1 || cleanlinessRating > 5 || 
            staffRating < 1 || staffRating > 5) {
            return res.status(400).json({ error: "Reytinqlər 1-5 arası olmalıdır" });
        }

        const feedback = new FeedbackModal({
            foodRating,
            cleanlinessRating,
            staffRating,
            message: message || ""
        });

        const savedFeedback = await feedback.save();
        res.status(201).json({ 
            message: "Geri bildirim uğurla göndərildi", 
            feedback: savedFeedback 
        });
    } catch (error) {
        console.error("Feedback xətası:", error);
        res.status(500).json({ error: error.message });
    }
});

// Admin feedback-ləri görə bilər (token tələb olunur)
router.use(CheckToken);
router.get("/", async (req, res) => {
    try {
        const feedbacks = await FeedbackModal.find().sort({ createdAt: -1 });
        res.json(feedbacks);
    } catch (error) {
        console.error("Feedback-ləri gətirərkən xəta:", error);
        res.status(500).json({ error: error.message });
    }
});

export default router;




