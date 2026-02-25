import mongoose from 'mongoose';

const setRequestSchema = mongoose.Schema({
    customerName: {
        type: String,
        trim: true,
        default: '',
    },
    setDescription: {
        type: String,
        required: true,
        trim: true,
    },
    phone: {
        type: String,
        trim: true,
        default: '',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

setRequestSchema.index({ createdAt: -1 });

export default mongoose.model('SetRequest', setRequestSchema);
