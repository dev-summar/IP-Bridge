import './config/dns';
import dotenv from 'dotenv';
// Load environment variables (Updated Razorpay config)
dotenv.config();

import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db';
import { seedInitialUsers } from './controllers/authController';
import { seedInitialPatents } from './controllers/patentController';
import apiRouter from './routes/api';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware configuration
app.use(cors({
  origin: '*', // For development, allow all origins
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Welcome page / Health check
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'PatentBridge AI Engine & REST API is fully operational.',
    version: '1.0.0',
    documentation: '/api'
  });
});

// Register API Routes
app.use('/api', apiRouter);

// Initialize DB and start server
async function startServer() {
  console.log('[System] Initializing PatentBridge Backend Service...');
  
  // 1. Connect to DB (MongoDB or JSON Fallback)
  await connectDB();
  
  // 2. Run Seeding
  await seedInitialUsers();
  await seedInitialPatents();
  
  // 3. Start Listener
  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 PatentBridge API running at http://localhost:${PORT}`);
    console.log(`🌐 Health check endpoint: http://localhost:${PORT}/`);
    console.log(`======================================================\n`);
  });
}

startServer().catch(err => {
  console.error('[System] Critical error starting server:', err);
  process.exit(1);
});
// Trigger reload - connect to Atlas MDB
