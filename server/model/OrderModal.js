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
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Order", orderSchema); 