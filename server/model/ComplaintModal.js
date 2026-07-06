import mongoose from 'mongoose';

const complaintSchema = mongoose.Schema({
    message: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000,
    },
    customerName: {
        type: String,
        default: '',
        trim: true,
        maxlength: 120,
    },
    phone: {
        type: String,
        default: '',
        trim: true,
        maxlength: 30,
    },
    accessCode: {
        type: String,
        default: '9544',
    },
    isRead: {
        type: Boolean,
        default: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

complaintSchema.index({ createdAt: -1 });
complaintSchema.index({ isRead: 1 });

export default mongoose.model('Complaint', complaintSchema);
