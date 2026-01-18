import mongoose from "mongoose";

const tableSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    hourlyPrice: {
        type: Number,
        required: true,
        default: 0,
    },
    ps3Price: {
        type: Number,
        default: 0,
    },
    ps4Price: {
        type: Number,
        default: 0,
    },
    ps5Price: {
        type: Number,
        default: 0,
    },
    defaultPS: {
        type: String,
        enum: ['PS3', 'PS4', 'PS5', null],
        default: null,
    },
    createdAt: { type: Date, default: Date.now },
});

tableSchema.virtual('id').get(function () {
    return this._id.toHexString();
});
tableSchema.set('toJSON', { virtuals: true });

// Performance indexes
tableSchema.index({ name: 1 }); // For finding by name

export default mongoose.model("Table", tableSchema); 