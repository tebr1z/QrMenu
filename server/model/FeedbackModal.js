import mongoose from "mongoose";

const feedbackModalSchema = mongoose.Schema({
    foodRating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    cleanlinessRating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    staffRating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    message: {
        type: String,
        trim: true,
        maxlength: 500
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model("Feedback", feedbackModalSchema);




