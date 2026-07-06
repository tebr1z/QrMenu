import mongoose from 'mongoose';

const categorySchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    image: {
        type: String,
        trim: true,
        default: ''
    },
    imageId: {
        type: String,
        trim: true,
    },
    order: {
        type: Number,
        default: 0,
    },
    /** false = müştəri QR menyusunda görünmür; admin/kassa tərəfdə aktiv qalır */
    showInCustomerMenu: {
        type: Boolean,
        default: true,
    },
    createdAt: { type: Date, default: Date.now },
},
)

// Performance indexes
categorySchema.index({ order: 1, createdAt: -1 }); // For GetCategory sorting
categorySchema.index({ name: 1 }); // For finding by name

export default mongoose.model('Category', categorySchema);