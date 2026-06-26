import mongoose from 'mongoose';
import { setUseMongo } from '../services/dbStore';

export async function connectDB() {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/patentbridge';
  const safeUri = mongoURI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');

  console.log(`[Database] Attempting to connect to MongoDB at: ${safeUri}`);

  try {
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
    });
    console.log('[Database] MongoDB connected successfully.');
    setUseMongo(true);
  } catch (error: any) {
    console.warn('[Database] MongoDB connection failed. Message:', error.message);
    console.warn('[Database] FALLBACK: PatentBridge will operate in JSON-file database mode.');
    setUseMongo(false);
  }
}
