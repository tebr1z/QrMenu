import mongoose from 'mongoose';

const expenseSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    amount: {
        type: Number,
        required: true,
        default: 0,
    },
    note: {
        type: String,
        trim: true,
    },
    date: {
        type: Date,
        required: true,
        default: () => new Date(),
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Indexes for fast date queries
expenseSchema.index({ date: -1 });
expenseSchema.index({ createdAt: -1 });

export default mongoose.model('Expense', expenseSchema);

