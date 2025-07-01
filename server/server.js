import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import mongoose from 'mongoose';
import clodinary from 'cloudinary';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

import allRouter from './AllRoutes.js';

// start connection
import { connectMongoDb } from './connection/DbConnection.js';
import { ClodinaryConnection } from './connection/ClodinaryConnection.js';


const app = express();
dotenv.config();

const PORT = process.env.PORT || 4545;
const corsOptions = {
    origin: "http://localhost:5173",
    credentials: true,
};

app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(express.json());
app.use(cookieParser());
app.use(fileUpload({ useTempFiles: true }));

app.use('/api', allRouter);

app.listen(PORT, async () => {
    try {
        await connectMongoDb()
        ClodinaryConnection()
        console.log(`Server is running on port ${PORT}`);
    } catch (error) {
        console.log(error)
    }
});

