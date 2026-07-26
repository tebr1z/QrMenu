import mongoose from "mongoose";

const tableSessionSchema = mongoose.Schema({
    tableId: { type: String, required: true },
    tableName: { type: String, required: true },
    startTime: { type: Number, required: true },
    hourlyPrice: { type: Number, required: true },
    selectedMenu: { type: Array, required: true },
    timer: { type: Number, default: 0 }, // Timer in seconds
    isActive: { type: Boolean, default: true }, // Whether session is active
    selectedSet: { type: String, default: null }, // Selected set product ID
    setFreeMinutes: { type: Number, default: null }, // Free minutes from set
    selectedHours: { type: Number, default: null }, // Selected hours for notification
    countdownStarted: { type: Boolean, default: false }, // Whether countdown has started
    countdownStartTime: { type: Number, default: null }, // When countdown started (timestamp)
    psType: { type: String, enum: ['PS3', 'PS4', 'PS5'], default: null }, // Current PS type
    selectedFreeMinutes: { type: Number, default: null }, // Selected free minutes from product
    psHistory: [{
        psType: { type: String, enum: ['PS3', 'PS4', 'PS5'], required: true },
        hourlyPrice: { type: Number, required: true },
        startTime: { type: Number, required: true }, // When this PS started
        endTime: { type: Number, default: null } // When this PS ended (null if current)
    }], // History of PS changes
    createdAt: { type: Date, default: Date.now },
});

// Performance indexes for faster queries
tableSessionSchema.index({ isActive: 1 }); // For /Active endpoint
tableSessionSchema.index({ tableId: 1 }); // For finding sessions by table
/** Eyni masa üçün eyni anda yalnız 1 aktiv session */
tableSessionSchema.index(
  { tableId: 1 },
  { unique: true, partialFilterExpression: { isActive: true }, name: 'unique_active_table' }
);

export default mongoose.model("TableSession", tableSessionSchema); 