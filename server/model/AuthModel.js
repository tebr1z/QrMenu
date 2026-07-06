import mongoose from "mongoose";

const pagePermissionSchema = {
    view: { type: Boolean, default: false },
    edit: { type: Boolean, default: false },
    delete: { type: Boolean, default: false },
};

const AuthSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    username: {
        type: String,
        trim: true,
        sparse: true,
        unique: true,
    },
    email: {
        type: String,
        required: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
        trim: true,
    },
    role: {
        type: String,
        enum: ['master_admin', 'staff', 'kassa', 'novbe'],
        default: 'staff',
    },
    permissions: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
})

export default mongoose.model("Auth", AuthSchema);