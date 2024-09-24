// require('dotenv').config({path: './env'});
import dotenv from 'dotenv';
import connectDb from "./db/index.js";


dotenv.config({
    path: './env'
})
connectDb();



/*
import express from 'express';
import mongoose from 'mongoose';
import { DB_NAME } from './constants';


const app = express();

(async() => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        app.on("error", (error) => {
            console.log("Err: ", error);
            throw error;
        });

        app.listen(process.env.PORT, () => {
            console.log(`App is listenning on port http://localhost:${process.env.PORT}`);
        })
    } catch(error) {
        console.log(error);
    }
})

*/