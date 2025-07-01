import mongoose from "mongoose";

const productSchema =  mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        // required: true,
        trim: true,
    },
    price: {
        type: Number,
        required: true,
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        required: true,
    },
    image: {
        type: String,
        trim: true,
        default: "https://www.iseu.bsu.by/en/wp-content/plugins/elementor/assets/images/placeholder.png",
    },
    imageId: {
        type: String,
        trim: true,
    },
    freeMinutes: {
        type: Number,
        default: 0,
    },
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Product", productSchema);