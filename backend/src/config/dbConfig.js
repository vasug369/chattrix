import mongoose from "mongoose";
import env from "./env.js";

/**
 * Connect to Mongo.
 *
 * The previous version called mongoose.connect() at module scope, so merely
 * importing this file opened a connection — which is why tests could not point
 * the app at a throwaway database. The connection now happens only when
 * connectDB() is called, and the URI is injectable.
 */
export const connectDB = async (uri = env.mongoUri) => {
    if (!uri) {
        throw new Error(
            'No MongoDB connection string. Set MONGO_URI, or DB_Host/DB_Pass/DB_Name.'
        );
    }

    mongoose.set('strictQuery', true);

    try {
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 10000,
        });
        if (!env.isTest) console.log('MongoDB connected');
        return mongoose.connection;
    } catch (err) {
        console.error('MongoDB connection failed:', err.message);
        throw err;
    }
};

export const disconnectDB = async () => {
    await mongoose.disconnect();
};

export default connectDB;
