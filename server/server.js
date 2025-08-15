import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import mongoose from 'mongoose';
import clodinary from 'cloudinary';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

import AllRoutes from "./AllRoutes.js";

// start connection
import { connectMongoDb } from './connection/DbConnection.js';
import { ClodinaryConnection } from './connection/ClodinaryConnection.js';


const app = express();
dotenv.config();

const PORT = process.env.PORT || 4545;
const corsOptions = {
    origin: true, // Allow all origins in development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
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
        await connectMongoDb()
        ClodinaryConnection()
        console.log(`Server is running on port ${PORT}`);
    } catch (error) {
        console.log(error)
    }
});

