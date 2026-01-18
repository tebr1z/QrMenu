import mongoose from "mongoose";

const orderSchema = mongoose.Schema({
    tableId: { type: String, required: true },
    tableName: { type: String, required: true },
    startTime: { type: Number, required: true },
    endTime: { type: Number, required: true },
    durationMinutes: { type: Number, required: true },
    hourlyPrice: { type: Number, required: true },
    hourTotal: { type: Number, required: true },
    selectedMenu: { type: Array, required: true },
    menuTotal: { type: Number, required: true },
    total: { type: Number, required: true },
    freeInfo: { type: String },
    orderId: { type: String, unique: true, sparse: true }, // Unique order ID to prevent duplicates
    psType: { type: String, enum: ['PS3', 'PS4', 'PS5'], default: null }, // Selected PS type
    psPriceDifference: { type: Number, default: 0 }, // Price difference for free time when playing on different PS
    psHistory: [{ // History of PS type changes during the session
        psType: { type: String, enum: ['PS3', 'PS4', 'PS5'], required: true },
        hourlyPrice: { type: Number, required: true },
        startTime: { type: Number, required: true }, // When this PS started
        endTime: { type: Number, default: null } // When this PS ended (null if current)
    }],
    createdAt: { type: Date, default: Date.now },
});

// Performance indexes for faster queries
// Note: orderId already has index from unique: true, sparse: true
orderSchema.index({ tableId: 1, startTime: 1, endTime: 1 }); // For duplicate check
orderSchema.index({ createdAt: -1 }); // For GetOrders sorting

export default mongoose.model("Order", orderSchema); 