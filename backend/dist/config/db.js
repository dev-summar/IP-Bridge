"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = connectDB;
const mongoose_1 = __importDefault(require("mongoose"));
const dbStore_1 = require("../services/dbStore");
async function connectDB() {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/patentbridge';
    console.log(`[Database] Attempting to connect to MongoDB at: ${mongoURI}`);
    try {
        await mongoose_1.default.connect(mongoURI, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 5000,
            tlsAllowInvalidCertificates: true
        });
        console.log('[Database] MongoDB connected successfully.');
        (0, dbStore_1.setUseMongo)(true);
    }
    catch (error) {
        console.warn('[Database] MongoDB connection failed. Message:', error.message);
        console.warn('[Database] FALLBACK: PatentBridge will operate in JSON-file database mode.');
        (0, dbStore_1.setUseMongo)(false);
    }
}
