import mongoose from 'mongoose';

const extraServiceSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    price: {
        type: Number,
        required: true,
        default: 0,
    },
    createdAt: { type: Date, default: Date.now },
});

extraServiceSchema.index({ createdAt: -1 });
extraServiceSchema.index({ name: 1 });

export default mongoose.model('ExtraService', extraServiceSchema);
