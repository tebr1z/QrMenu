import mongoose from 'mongoose';

const auditLogSchema = mongoose.Schema({
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    userEmail: { type: String, default: '' },
    action: {
        type: String,
        enum: ['create', 'update', 'delete', 'login', 'activity', 'other'],
        required: true,
    },
    resource: { type: String, required: true },
    resourceId: { type: String, default: '' },
    summary: { type: String, required: true },
    details: { type: mongoose.Schema.Types.Mixed, default: null },
    createdAt: { type: Date, default: Date.now },
});

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, createdAt: -1 });

export default mongoose.model('AuditLog', auditLogSchema);
