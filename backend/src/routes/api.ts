import { Router } from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import { 
  register, login, getMe, getAllUsers 
} from '../controllers/authController';
import { 
  getMarketplacePatents, getAIMatchedPatents, registerPatent, getMyPortfolio, 
  getPendingPatents, getPatentById, reviewPatent, 
  toggleSavePatent, getSavedPatents, reanalyzePatent, reanalyzeAllPatents 
} from '../controllers/patentController';
import { 
  createInterestRequest, createMeetingRequest, 
  getLeads, getMeetings, updateLeadStatus, updateMeetingStatus,
  createAccessRequest, getAccessStatus, getAccessRequests, updateAccessRequestStatus
} from '../controllers/interactionController';
import { 
  getDashboardAnalytics 
} from '../controllers/analyticsController';
import { 
  createOffer, getOffers, updateOfferStatus 
} from '../controllers/offerController';
import {
  checkNDAStatus, signNDA, downloadNDADocx, getSignedNDAs
} from '../controllers/documentController';
import {
  getTransactions, fundTransaction, releaseMilestone, downloadDeedDocx, createRazorpayOrder, verifyRazorpayPayment
} from '../controllers/transactionController';

const router = Router();

// ==========================================
// Authentication Routes
// ==========================================
router.post('/auth/register', register);
router.post('/auth/login', login);
router.get('/auth/me', authenticateToken, getMe);
router.get('/auth/users', authenticateToken, authorizeRoles('admin'), getAllUsers);

// ==========================================
// Patent Listings Routes
// ==========================================
router.get('/patents', getMarketplacePatents);
router.post('/patents/ai-match', getAIMatchedPatents);
router.get('/patents/pending', authenticateToken, authorizeRoles('admin'), getPendingPatents);
router.get('/patents/my-portfolio', authenticateToken, authorizeRoles('owner'), getMyPortfolio);
router.get('/patents/saved', authenticateToken, authorizeRoles('buyer'), getSavedPatents);
router.get('/patents/:id', getPatentById);
router.post('/patents', authenticateToken, authorizeRoles('owner'), registerPatent);
router.put('/patents/:id/review', authenticateToken, authorizeRoles('admin'), reviewPatent);
router.post('/patents/:id/reanalyze', authenticateToken, authorizeRoles('owner', 'admin'), reanalyzePatent);
router.post('/patents/reanalyze-all', authenticateToken, authorizeRoles('admin'), reanalyzeAllPatents);
router.post('/patents/:id/save', authenticateToken, authorizeRoles('buyer'), toggleSavePatent);

// ==========================================
// lead / meeting System Routes
// ==========================================
router.post('/patents/:id/interest', authenticateToken, authorizeRoles('buyer'), createInterestRequest);
router.post('/patents/:id/meeting', authenticateToken, authorizeRoles('buyer'), createMeetingRequest);
router.get('/interactions/leads', authenticateToken, getLeads);
router.get('/interactions/meetings', authenticateToken, getMeetings);
router.put('/interactions/leads/:id', authenticateToken, authorizeRoles('owner', 'admin'), updateLeadStatus);
router.put('/interactions/meetings/:id', authenticateToken, authorizeRoles('owner', 'admin'), updateMeetingStatus);

// ==========================================
// Access / Unlock Request Routes
// ==========================================
router.post('/patents/:id/access-request', authenticateToken, authorizeRoles('buyer'), createAccessRequest);
router.get('/patents/:id/access-status', authenticateToken, getAccessStatus);
router.get('/interactions/access-requests', authenticateToken, authorizeRoles('owner', 'admin'), getAccessRequests);
router.put('/interactions/access-requests/:id', authenticateToken, authorizeRoles('owner', 'admin'), updateAccessRequestStatus);

// ==========================================
// Offer / Transaction Routes
// ==========================================
router.post('/offers', authenticateToken, createOffer);
router.get('/offers', authenticateToken, getOffers);
router.put('/offers/:id', authenticateToken, updateOfferStatus);

router.get('/transactions', authenticateToken, getTransactions);
router.post('/transactions/:id/fund', authenticateToken, fundTransaction);
router.post('/transactions/:id/razorpay-order', authenticateToken, createRazorpayOrder);
router.post('/transactions/:id/verify-payment', authenticateToken, verifyRazorpayPayment);
router.post('/transactions/:id/milestones/:index/release', authenticateToken, releaseMilestone);
router.get('/transactions/:id/deed', authenticateToken, downloadDeedDocx);

// ==========================================
// Document / NDA Routes
// ==========================================
router.get('/patents/:id/nda/status', authenticateToken, checkNDAStatus);
router.post('/patents/:id/nda/sign', authenticateToken, authorizeRoles('buyer'), signNDA);
router.get('/patents/:id/nda/download', authenticateToken, downloadNDADocx);
router.get('/nda', authenticateToken, getSignedNDAs);

// ==========================================
// Analytics Route
// ==========================================
router.get('/analytics/dashboard', authenticateToken, getDashboardAnalytics);

export default router;
