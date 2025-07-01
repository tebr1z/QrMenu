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
        default: 'https://www.iseu.bsu.by/en/wp-content/plugins/elementor/assets/images/placeholder.png'
    },
    imageId: {
        type: String,
        trim: true,
    },
    createdAt: { type: Date, default: Date.now },
},
)

export default mongoose.model('Category', categorySchema);