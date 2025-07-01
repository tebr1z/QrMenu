import mongoose from "mongoose";

const webAboutModalSchema =  mongoose.Schema({
    wifiName: {
        type: String,
        trim: true,
        default: 'Wifi Name'
    },
    wifiPassword: {
        type: String,
        trim: true,
        default: 'Wifi Password'
    },
    location: {
        type: String,
        trim: true,
        default: 'Location'
    },
    phone: {
        type: String,
        trim: true,
        default: 'Phone Number'
    },
    day: {
        type: [
            {
                name: {
                    type: String,
                    trim: true,
                    required: true
                },
                openingTime: {
                    type: String,
                    trim: true,
                    default: '08:00'
                },
                closingTime: {
                    type: String,
                    trim: true,
                    default: '20:00'
                },
            }
        ],
        default: () => [
            { name: "Bazar ertəsi", openingTime: "08:00", closingTime: "20:00" },
            { name: "Çərşənbə axşamı", openingTime: "08:00", closingTime: "20:00" },
            { name: "Çərşənbə", openingTime: "08:00", closingTime: "20:00" },
            { name: "Cümə axşamı", openingTime: "08:00", closingTime: "20:00" },
            { name: "Cümə", openingTime: "08:00", closingTime: "22:00" },
            { name: "Şənbə", openingTime: "09:00", closingTime: "22:00" },
            { name: "Bazar", openingTime: "09:00", closingTime: "18:00" }
        ]
    }
});

export default mongoose.model("WebAbout", webAboutModalSchema);
