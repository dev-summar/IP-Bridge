"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const authController_1 = require("../controllers/authController");
const patentController_1 = require("../controllers/patentController");
const interactionController_1 = require("../controllers/interactionController");
const analyticsController_1 = require("../controllers/analyticsController");
const offerController_1 = require("../controllers/offerController");
const documentController_1 = require("../controllers/documentController");
const transactionController_1 = require("../controllers/transactionController");
const router = (0, express_1.Router)();
// ==========================================
// Authentication Routes
// ==========================================
router.post('/auth/register', authController_1.register);
router.post('/auth/login', authController_1.login);
router.get('/auth/me', auth_1.authenticateToken, authController_1.getMe);
router.get('/auth/users', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('admin'), authController_1.getAllUsers);
// ==========================================
// Patent Listings Routes
// ==========================================
router.get('/patents', patentController_1.getMarketplacePatents);
router.post('/patents/ai-match', patentController_1.getAIMatchedPatents);
router.get('/patents/pending', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('admin'), patentController_1.getPendingPatents);
router.get('/patents/my-portfolio', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('owner'), patentController_1.getMyPortfolio);
router.get('/patents/saved', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('buyer'), patentController_1.getSavedPatents);
router.get('/patents/:id', patentController_1.getPatentById);
router.post('/patents', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('owner'), patentController_1.registerPatent);
router.put('/patents/:id/review', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('admin'), patentController_1.reviewPatent);
router.post('/patents/:id/save', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('buyer'), patentController_1.toggleSavePatent);
// ==========================================
// lead / meeting System Routes
// ==========================================
router.post('/patents/:id/interest', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('buyer'), interactionController_1.createInterestRequest);
router.post('/patents/:id/meeting', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('buyer'), interactionController_1.createMeetingRequest);
router.get('/interactions/leads', auth_1.authenticateToken, interactionController_1.getLeads);
router.get('/interactions/meetings', auth_1.authenticateToken, interactionController_1.getMeetings);
router.put('/interactions/leads/:id', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('owner', 'admin'), interactionController_1.updateLeadStatus);
router.put('/interactions/meetings/:id', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('owner', 'admin'), interactionController_1.updateMeetingStatus);
// ==========================================
// Access / Unlock Request Routes
// ==========================================
router.post('/patents/:id/access-request', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('buyer'), interactionController_1.createAccessRequest);
router.get('/patents/:id/access-status', auth_1.authenticateToken, interactionController_1.getAccessStatus);
router.get('/interactions/access-requests', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('owner', 'admin'), interactionController_1.getAccessRequests);
router.put('/interactions/access-requests/:id', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('owner', 'admin'), interactionController_1.updateAccessRequestStatus);
// ==========================================
// Offer / Transaction Routes
// ==========================================
router.post('/offers', auth_1.authenticateToken, offerController_1.createOffer);
router.get('/offers', auth_1.authenticateToken, offerController_1.getOffers);
router.put('/offers/:id', auth_1.authenticateToken, offerController_1.updateOfferStatus);
router.get('/transactions', auth_1.authenticateToken, transactionController_1.getTransactions);
router.post('/transactions/:id/fund', auth_1.authenticateToken, transactionController_1.fundTransaction);
router.post('/transactions/:id/razorpay-order', auth_1.authenticateToken, transactionController_1.createRazorpayOrder);
router.post('/transactions/:id/verify-payment', auth_1.authenticateToken, transactionController_1.verifyRazorpayPayment);
router.post('/transactions/:id/milestones/:index/release', auth_1.authenticateToken, transactionController_1.releaseMilestone);
router.get('/transactions/:id/deed', auth_1.authenticateToken, transactionController_1.downloadDeedDocx);
// ==========================================
// Document / NDA Routes
// ==========================================
router.get('/patents/:id/nda/status', auth_1.authenticateToken, documentController_1.checkNDAStatus);
router.post('/patents/:id/nda/sign', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('buyer'), documentController_1.signNDA);
router.get('/patents/:id/nda/download', auth_1.authenticateToken, documentController_1.downloadNDADocx);
router.get('/nda', auth_1.authenticateToken, documentController_1.getSignedNDAs);
// ==========================================
// Analytics Route
// ==========================================
router.get('/analytics/dashboard', auth_1.authenticateToken, analyticsController_1.getDashboardAnalytics);
exports.default = router;
