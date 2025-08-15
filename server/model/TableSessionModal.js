import mongoose from "mongoose";

const tableSessionSchema = mongoose.Schema({
    tableId: { type: String, required: true },
    tableName: { type: String, required: true },
    startTime: { type: Number, required: true },
    hourlyPrice: { type: Number, required: true },
    selectedMenu: { type: Array, required: true },
    timer: { type: Number, default: 0 }, // Timer in seconds
    isActive: { type: Boolean, default: true }, // Whether session is active
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("TableSession", tableSessionSchema); 