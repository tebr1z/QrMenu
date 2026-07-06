import mongoose from 'mongoose';

const employeeSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    accessCode: {
        type: String,
        required: true,
        trim: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    dailyAmount: {
        type: Number,
        default: 0,
    },
    payType: {
        type: String,
        enum: ['daily', 'monthly', 'daily_premium'],
        default: 'daily',
    },
    monthlyAmount: {
        type: Number,
        default: 0,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

employeeSchema.index({ accessCode: 1 });

export default mongoose.model('Employee', employeeSchema);
