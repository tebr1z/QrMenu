import mongoose from 'mongoose';

const configSchema = mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    value: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

configSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

export default mongoose.model('Config', configSchema);

