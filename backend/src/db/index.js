import mongoose from 'mongoose';
import { DB_NAME } from '../constants.js';

const connectDb = async() => {
    try {
        console.log(process.env.MONGODB_URI);
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log(`\nMongodb connected..DB host: ${connectionInstance.connection.host}`);
        // good practice to check whether connected to production or development server
    } catch(error) {
        console.log(error);
        process.exit(1);

        // exit code 1  indicates that a container shut down, either because of an application failure or because the image pointed to an invalid file.
    }
};

export default connectDb;