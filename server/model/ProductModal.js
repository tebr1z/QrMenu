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
        default: "",
    },
    imageId: {
        type: String,
        trim: true,
    },
    freeMinutes: {
        type: Number,
        default: 0,
    },
    freeMinutesForPS: {
        type: String,
        enum: ['PS3', 'PS4', 'PS5', null],
        default: null,
    },
    order: {
        type: Number,
        default: 0,
    },
    stockQuantity: {
        type: Number,
        default: 0,
    },
    purchasePrice: {
        type: Number,
        default: 0,
    },
    unitCost: {
        type: Number,
        default: 0,
    },
    isSet: {
        type: Boolean,
        default: false,
    },
    setItems: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
        },
        quantity: {
            type: Number,
            default: 1,
        }
    }],
    createdAt: { type: Date, default: Date.now },
});

// Performance indexes for faster queries
productSchema.index({ category: 1, order: 1 }); // For GetProduct/:name sorting
productSchema.index({ name: 1 }); // For search queries

export default mongoose.model("Product", productSchema);