"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables (Updated Razorpay config)
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const db_1 = require("./config/db");
const authController_1 = require("./controllers/authController");
const patentController_1 = require("./controllers/patentController");
const api_1 = __importDefault(require("./routes/api"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Middleware configuration
app.use((0, cors_1.default)({
    origin: '*', // For development, allow all origins
    credentials: true
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
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
app.use('/api', api_1.default);
// Initialize DB and start server
async function startServer() {
    console.log('[System] Initializing PatentBridge Backend Service...');
    // 1. Connect to DB (MongoDB or JSON Fallback)
    await (0, db_1.connectDB)();
    // 2. Run Seeding
    await (0, authController_1.seedInitialUsers)();
    await (0, patentController_1.seedInitialPatents)();
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
