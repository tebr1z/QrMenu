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
    createdAt: { type: Date, default: Date.now },
});

tableSchema.virtual('id').get(function () {
    return this._id.toHexString();
});
tableSchema.set('toJSON', { virtuals: true });

export default mongoose.model("Table", tableSchema); 