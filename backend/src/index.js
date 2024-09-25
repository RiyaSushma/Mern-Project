// require('dotenv').config({path: './env'});
import dotenv from 'dotenv';
import connectDb from "./db/index.js";
import app from './app.js';


dotenv.config({
    path: './env'
})

connectDb()
.then(() => {
    app.on("error", (error) => {
        console.log("Error: ", error);
        throw error;
    });

    app.listen(process.env.PORT || 3000, () => {
        console.log(`Server running at port http://localhost:${process.env.PORT || 3000}`);
    });
}).catch(error => {
    console.log("Mongodb connection failed with error: ", error);
});



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