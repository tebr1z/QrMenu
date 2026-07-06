import mongoose from 'mongoose';

const dayEntrySchema = mongoose.Schema({
    date: String,
    amount: Number,
    withdrawnAt: Date,
}, { _id: false });

const employeeEntrySchema = mongoose.Schema({
    employeeId: String,
    employeeName: String,
    total: Number,
    days: [dayEntrySchema],
}, { _id: false });

const employeePayrollArchiveSchema = mongoose.Schema({
    periodKey: {
        type: String,
        required: true,
        unique: true,
    },
    start: { type: String, required: true },
    end: { type: String, required: true },
    archivedAt: { type: Date, default: Date.now },
    employees: [employeeEntrySchema],
    totalAmount: { type: Number, default: 0 },
    withdrawalCount: { type: Number, default: 0 },
});

employeePayrollArchiveSchema.index({ end: -1 });

export default mongoose.model('EmployeePayrollArchive', employeePayrollArchiveSchema);
