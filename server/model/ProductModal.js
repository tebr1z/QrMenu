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
    oldPrice: {
        type: Number,
        default: 0,
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
    stockUnit: {
        type: String,
        enum: ['piece', 'kg', 'g'],
        default: 'piece',
    },
    portionSize: {
        type: Number,
        default: 0,
    },
    portionUnit: {
        type: String,
        enum: ['piece', 'kg', 'g'],
        default: 'piece',
    },
    lowStockThreshold: {
        type: Number,
        default: 5,
    },
    purchasePrice: {
        type: Number,
        default: 0,
    },
    unitCost: {
        type: Number,
        default: 0,
    },
    salesCost: {
        type: Number,
        default: 0,
    },
    /** false = yalnız admin/kassa/stok; müştəri QR menyusunda görünmür */
    showInCustomerMenu: {
        type: Boolean,
        default: true,
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
        },
        portions: {
            type: Number,
            default: 1,
        },
        /** Set anbar: 1 satışda çıxan miqdar */
        deductAmount: { type: Number, default: 0 },
        deductUnit: {
            type: String,
            enum: ['piece', 'kg', 'g'],
            default: 'g',
        },
        /** @deprecated köhnə rejimlər — yalnız köhnə məlumat üçün */
        stockMode: {
            type: String,
            enum: ['portion', 'pack_split', 'fixed_weight'],
            default: 'portion',
        },
        packSize: { type: Number, default: 0 },
        packUnit: {
            type: String,
            enum: ['piece', 'kg', 'g'],
            default: 'g',
        },
        splitsPerPack: { type: Number, default: 0 },
        serveAmount: { type: Number, default: 0 },
        serveUnit: {
            type: String,
            enum: ['piece', 'kg', 'g'],
            default: 'g',
        },
        section: {
            type: String,
            enum: ['qr', 'internal'],
            default: 'qr',
        },
        linkedProductId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
        },
    }],
    ingredients: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
        },
        amount: {
            type: Number,
            default: 1,
        },
        unit: {
            type: String,
            enum: ['piece', 'kg', 'g'],
            default: 'piece',
        },
    }],
    createdAt: { type: Date, default: Date.now },
});

// Performance indexes for faster queries
productSchema.index({ category: 1, order: 1 }); // For GetProduct/:name sorting
productSchema.index({ name: 1 }); // For search queries

export default mongoose.model("Product", productSchema);