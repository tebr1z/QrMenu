import mongoose from "mongoose";

const tableSessionSchema = mongoose.Schema({
    tableId: { type: String, required: true },
    tableName: { type: String, required: true },
    startTime: { type: Number, required: true },
    hourlyPrice: { type: Number, required: true },
    selectedMenu: { type: Array, required: true },
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("TableSession", tableSessionSchema); 