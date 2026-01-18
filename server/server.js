import express from 'express';
import http from 'http';
import bodyParser from 'body-parser';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

import AllRoutes from "./AllRoutes.js";
import { Server as SocketIOServer } from 'socket.io';

// start connection
import { connectMongoDb } from './connection/DbConnection.js';
import { ClodinaryConnection } from './connection/ClodinaryConnection.js';


const app = express();
dotenv.config();

const PORT = process.env.PORT || 4548;
const corsOptions = {
    origin: 'http://localhost:5173',  // Specific origin
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
    exposedHeaders: ['Set-Cookie']
};

app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(express.json());
app.use(cookieParser());
app.use(fileUpload({ useTempFiles: true }));

app.use("/api", AllRoutes);

const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
    cors: {
        origin: 'http://localhost:5173',
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    }
});

app.set('io', io);

httpServer.listen(PORT, async () => {
    try {
        await connectMongoDb()
        ClodinaryConnection()
        console.log(`Server is running on port ${PORT}`);
    } catch (error) {
        console.log(error)
    }
});

