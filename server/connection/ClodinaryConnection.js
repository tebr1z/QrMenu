import { v2 as cloudinary } from "cloudinary";

const ClodinaryConnection = () => {
    // Use environment variables from .env file
    const cloudinaryConfig = {
        cloud_name: process.env.CLOUD_NAME,
        api_key: process.env.CLOUD_API_KEY,
        api_secret: process.env.CLOUD_API_SECRET_KEY
    };
    
    console.log('Cloudinary config check:');
    console.log('CLOUD_NAME:', cloudinaryConfig.cloud_name);
    console.log('CLOUD_API_KEY:', cloudinaryConfig.api_key ? '***' : 'NOT SET');
    console.log('CLOUD_API_SECRET_KEY:', cloudinaryConfig.api_secret ? '***' : 'NOT SET');
    
    // Also check for alternative environment variable names
    console.log('Alternative env vars:');
    console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME);
    console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY);
    console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET);
    
    // Check if all required config values are present
    if (!cloudinaryConfig.cloud_name || !cloudinaryConfig.api_key || !cloudinaryConfig.api_secret) {
        console.error('❌ Cloudinary configuration incomplete!');
        console.error('Please check your .env file for missing values.');
        return;
    }
    
    cloudinary.config(cloudinaryConfig);
    console.log("✅ Successfully connected to Cloudinary");
}

export { ClodinaryConnection };