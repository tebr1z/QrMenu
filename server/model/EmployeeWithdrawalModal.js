import mongoose from 'mongoose';

const employeeWithdrawalSchema = mongoose.Schema({
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true,
    },
    employeeName: {
        type: String,
        required: true,
        trim: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    dateKey: {
        type: String,
        required: true,
    },
    kind: {
        type: String,
        enum: ['daily', 'premium'],
        default: 'daily',
    },
    expenseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Expense',
    },
    withdrawnAt: {
        type: Date,
        default: Date.now,
    },
});

employeeWithdrawalSchema.index({ employeeId: 1, dateKey: 1, kind: 1 }, { unique: true });
employeeWithdrawalSchema.index({ withdrawnAt: -1 });
employeeWithdrawalSchema.index({ dateKey: -1 });

export default mongoose.model('EmployeeWithdrawal', employeeWithdrawalSchema);
