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
    createdAt: { type: Date, default: Date.now },
},
)

export default mongoose.model('Category', categorySchema);