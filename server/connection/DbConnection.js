import mongoose from "mongoose";

const connectMongoDb = async () => {
    try {
        await mongoose.connect(process.env.CONNECTING_MONGO_DB);
        console.log("Successfully connected to the database");
    } catch (error) {
        console.log(error);
    }
};

export { connectMongoDb };