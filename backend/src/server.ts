import './config/dns';
import dotenv from 'dotenv';
// Load environment variables (Updated Razorpay config)
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import { connectDB } from './config/db';
import { seedInitialUsers } from './controllers/authController';
import { seedInitialPatents } from './controllers/patentController';
import apiRouter from './routes/api';

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

// Middleware configuration
app.use(cors({
  origin: '*', // For development, allow all origins
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check for Render / monitoring
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'online',
    message: 'PatentBridge AI Engine & REST API is fully operational.',
    version: '1.0.0',
    documentation: '/api'
  });
});

// Register API Routes
app.use('/api', apiRouter);

// Serve built frontend in production (single-service deploy)
if (isProduction) {
  const frontendDist = path.join(__dirname, '../../frontend/dist');
  const indexHtml = path.join(frontendDist, 'index.html');

  const sendSpa = (_req: express.Request, res: express.Response) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.sendFile(indexHtml);
  };

  app.use(express.static(frontendDist, { index: false, maxAge: '1y' }));
  app.get('/', sendSpa);
  app.get(/^\/(?!api).*/, sendSpa);
}

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
    console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
    console.log(`======================================================\n`);
  });
}

startServer().catch(err => {
  console.error('[System] Critical error starting server:', err);
  process.exit(1);
});
// Trigger reload - connect to Atlas MDB
