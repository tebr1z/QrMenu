import { v2 as cloudinary } from "cloudinary";

const ClodinaryConnection = () => {
    cloudinary.config({
        cloud_name: process.env.CLOUD_NAME,
        api_key: process.env.CLOUD_API_KEY,
        api_secret: process.env.CLOUD_API_SECRET_KEY,
    });
    console.log("Successfully connected to the cloudinary");
}

export { ClodinaryConnection };