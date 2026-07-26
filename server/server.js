import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

import AllRoutes from "./AllRoutes.js";
// Gecə 03:00 kassa cron söndürülüb – pul Bitir basılanda birbaşa kassaya əlavə olunur
// import { startKassaCron } from './kassaCron.js';

// start connection
import { connectMongoDb } from './connection/DbConnection.js';
import { ClodinaryConnection } from './connection/ClodinaryConnection.js';
import { ensureSessionIntegrity } from './utils/ensureSessionIntegrity.js';


const app = express();
dotenv.config();

const PORT = process.env.PORT || 4550;
const allowedOrigins = (process.env.FRONTEND_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin) return callback(null, true); // allow non-browser requests
        if (process.env.NODE_ENV !== 'production') return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
    exposedHeaders: ['Set-Cookie']
};

app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(express.json());
app.use(cookieParser());
app.use(fileUpload({ useTempFiles: true }));

app.use("/api", AllRoutes);

app.listen(PORT, async () => {
    try {
        await connectMongoDb();
        ClodinaryConnection();
        // Hər start-da ghost/dublikat session-ları təmizlə + unique indeks
        await ensureSessionIntegrity();
        // startKassaCron(); // Pul Bitir basılanda kassaya əlavə olunur
        console.log(`Server is running on port ${PORT}`);
    } catch (error) {
        console.log(error)
    }
});

