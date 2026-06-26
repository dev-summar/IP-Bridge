"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionModel = exports.TransactionSchema = exports.AccessRequestModel = exports.AccessRequestSchema = exports.NDASignatureModel = exports.NDASignatureSchema = exports.OfferModel = exports.OfferSchema = exports.AuditLogModel = exports.AuditLogSchema = exports.MeetingRequestModel = exports.MeetingRequestSchema = exports.InterestRequestModel = exports.InterestRequestSchema = exports.PatentAnalysisModel = exports.PatentAnalysisSchema = exports.PatentModel = exports.PatentSchema = exports.UserModel = exports.UserSchema = void 0;
const mongoose_1 = __importStar(require("mongoose"));
exports.UserSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    organization: { type: String },
    role: { type: String, enum: ['admin', 'owner', 'buyer'], required: true },
    savedPatents: { type: [String], default: [] },
}, { timestamps: true });
exports.UserModel = mongoose_1.default.models.User || mongoose_1.default.model('User', exports.UserSchema);
exports.PatentSchema = new mongoose_1.Schema({
    patentNumber: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    abstract: { type: String, required: true },
    ownerId: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    pdfUrl: { type: String },
    askingPrice: { type: Number, default: 0 },
    isForSale: { type: Boolean, default: true },
    isForLicense: { type: Boolean, default: true }
}, { timestamps: true });
exports.PatentModel = mongoose_1.default.models.Patent || mongoose_1.default.model('Patent', exports.PatentSchema);
exports.PatentAnalysisSchema = new mongoose_1.Schema({
    patentId: { type: String, required: true, unique: true, index: true },
    summary: {
        description: { type: String, required: true },
        problemSolved: { type: String, required: true },
        commercialValue: { type: String, required: true },
        keyInnovation: { type: String, required: true }
    },
    industryClassification: { type: [String], required: true },
    keywords: { type: [String], default: [] },
    commercialApplications: {
        potentialIndustries: { type: [String], default: [] },
        useCases: { type: [String], default: [] },
        adoptionOpportunities: { type: [String], default: [] }
    },
    commercialPotentialScore: { type: Number, required: true, min: 0, max: 100 },
    potentialBuyers: { type: [String], default: [] },
    marketOpportunity: { type: String },
    filingYear: { type: Number },
    commercialBreakdown: {
        technicalFeasibility: { type: Number, default: 70 },
        marketDemand: { type: Number, default: 70 },
        implementationSpeed: { type: Number, default: 70 },
        licensingValue: { type: Number, default: 70 },
        ipProtection: { type: Number, default: 70 }
    }
}, { timestamps: true });
exports.PatentAnalysisModel = mongoose_1.default.models.PatentAnalysis || mongoose_1.default.model('PatentAnalysis', exports.PatentAnalysisSchema);
exports.InterestRequestSchema = new mongoose_1.Schema({
    patentId: { type: String, required: true, index: true },
    buyerId: { type: String, required: true },
    ownerId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    organization: { type: String, required: true },
    email: { type: String, required: true },
    purpose: { type: String, required: true },
    message: { type: String, required: true },
    status: { type: String, enum: ['new', 'reviewed', 'contacted'], default: 'new' }
}, { timestamps: true });
exports.InterestRequestModel = mongoose_1.default.models.InterestRequest || mongoose_1.default.model('InterestRequest', exports.InterestRequestSchema);
exports.MeetingRequestSchema = new mongoose_1.Schema({
    patentId: { type: String, required: true, index: true },
    buyerId: { type: String, required: true },
    ownerId: { type: String, required: true, index: true },
    preferredDate: { type: String, required: true },
    preferredTime: { type: String, required: true },
    notes: { type: String },
    status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
    videoCallLink: { type: String }
}, { timestamps: true });
exports.MeetingRequestModel = mongoose_1.default.models.MeetingRequest || mongoose_1.default.model('MeetingRequest', exports.MeetingRequestSchema);
exports.AuditLogSchema = new mongoose_1.Schema({
    userId: { type: String },
    action: { type: String, required: true },
    details: { type: String, required: true },
}, { timestamps: true });
exports.AuditLogModel = mongoose_1.default.models.AuditLog || mongoose_1.default.model('AuditLog', exports.AuditLogSchema);
exports.OfferSchema = new mongoose_1.Schema({
    patentId: { type: String, required: true, index: true },
    buyerId: { type: String, required: true, index: true },
    ownerId: { type: String, required: true, index: true },
    price: { type: Number, required: true },
    type: { type: String, enum: ['sale', 'license'], required: true },
    status: { type: String, enum: ['pending', 'accepted', 'declined', 'countered'], default: 'pending' },
    milestones: { type: [String], default: [] },
    counterPrice: { type: Number },
    notes: { type: String }
}, { timestamps: true });
exports.OfferModel = mongoose_1.default.models.Offer || mongoose_1.default.model('Offer', exports.OfferSchema);
exports.NDASignatureSchema = new mongoose_1.Schema({
    patentId: { type: String, required: true, index: true },
    buyerId: { type: String, required: true, index: true },
    fullName: { type: String, required: true },
    aadhaarNumber: { type: String, required: true },
    ipAddress: { type: String, required: true },
    signedAt: { type: Date, default: Date.now }
}, { timestamps: true });
exports.NDASignatureModel = mongoose_1.default.models.NDASignature || mongoose_1.default.model('NDASignature', exports.NDASignatureSchema);
exports.AccessRequestSchema = new mongoose_1.Schema({
    patentId: { type: String, required: true, index: true },
    buyerId: { type: String, required: true, index: true },
    ownerId: { type: String, required: true, index: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true }
}, { timestamps: true });
exports.AccessRequestModel = mongoose_1.default.models.AccessRequest || mongoose_1.default.model('AccessRequest', exports.AccessRequestSchema);
exports.TransactionSchema = new mongoose_1.Schema({
    offerId: { type: String, required: true, index: true },
    patentId: { type: String, required: true, index: true },
    buyerId: { type: String, required: true, index: true },
    ownerId: { type: String, required: true, index: true },
    amount: { type: Number, required: true },
    commissionAmount: { type: Number, required: true },
    netPayout: { type: Number, required: true },
    status: {
        type: String,
        enum: ['escrow_pending', 'escrow_funded', 'completed', 'disputed'],
        default: 'escrow_pending',
        index: true
    },
    paymentId: { type: String },
    milestones: {
        type: [{
                description: { type: String, required: true },
                percentage: { type: Number, required: true },
                amount: { type: Number, required: true },
                status: { type: String, enum: ['pending', 'released', 'disputed'], default: 'pending' },
                releasedAt: { type: Date }
            }],
        default: []
    }
}, { timestamps: true });
exports.TransactionModel = mongoose_1.default.models.Transaction || mongoose_1.default.model('Transaction', exports.TransactionSchema);
