import mongoose, { Schema, Document } from 'mongoose';

// User Schema
export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  organization?: string;
  role: 'admin' | 'owner' | 'buyer';
  savedPatents: string[];
  createdAt: Date;
  updatedAt: Date;
}

export const UserSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  organization: { type: String },
  role: { type: String, enum: ['admin', 'owner', 'buyer'], required: true },
  savedPatents: { type: [String], default: [] },
}, { timestamps: true });

export const UserModel = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

// Patent Schema
export interface IPatent extends Document {
  patentNumber: string;
  title: string;
  abstract: string;
  ownerId: string;
  status: 'pending' | 'approved' | 'rejected';
  pdfUrl?: string;
  askingPrice?: number;
  isForSale?: boolean;
  isForLicense?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const PatentSchema = new Schema<IPatent>({
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

export const PatentModel = mongoose.models.Patent || mongoose.model<IPatent>('Patent', PatentSchema);

// Patent Analysis Schema
export interface IPatentAnalysis extends Document {
  patentId: string;
  summary: {
    description: string;
    problemSolved: string;
    commercialValue: string;
    keyInnovation: string;
  };
  industryClassification: string[];
  keywords: string[];
  commercialApplications: {
    potentialIndustries: string[];
    useCases: string[];
    adoptionOpportunities: string[];
  };
  commercialPotentialScore: number;
  potentialBuyers?: string[];
  marketOpportunity?: string;
  filingYear?: number;
  commercialBreakdown?: {
    technicalFeasibility: number;
    marketDemand: number;
    implementationSpeed: number;
    licensingValue: number;
    ipProtection: number;
  };
  createdAt: Date;
}

export const PatentAnalysisSchema = new Schema<IPatentAnalysis>({
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

export const PatentAnalysisModel = mongoose.models.PatentAnalysis || mongoose.model<IPatentAnalysis>('PatentAnalysis', PatentAnalysisSchema);

// Interest Request Schema
export interface IInterestRequest extends Document {
  patentId: string;
  buyerId: string;
  ownerId: string;
  name: string;
  organization: string;
  email: string;
  purpose: string;
  message: string;
  status: 'new' | 'reviewed' | 'contacted';
  createdAt: Date;
}

export const InterestRequestSchema = new Schema<IInterestRequest>({
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

export const InterestRequestModel = mongoose.models.InterestRequest || mongoose.model<IInterestRequest>('InterestRequest', InterestRequestSchema);

// Meeting Request Schema
export interface IMeetingRequest extends Document {
  patentId: string;
  buyerId: string;
  ownerId: string;
  preferredDate: string;
  preferredTime: string;
  notes?: string;
  status: 'pending' | 'accepted' | 'declined';
  videoCallLink?: string;
  createdAt: Date;
}

export const MeetingRequestSchema = new Schema<IMeetingRequest>({
  patentId: { type: String, required: true, index: true },
  buyerId: { type: String, required: true },
  ownerId: { type: String, required: true, index: true },
  preferredDate: { type: String, required: true },
  preferredTime: { type: String, required: true },
  notes: { type: String },
  status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
  videoCallLink: { type: String }
}, { timestamps: true });

export const MeetingRequestModel = mongoose.models.MeetingRequest || mongoose.model<IMeetingRequest>('MeetingRequest', MeetingRequestSchema);

// Audit Log Schema
export interface IAuditLog extends Document {
  userId?: string;
  action: string;
  details: string;
  createdAt: Date;
}

export const AuditLogSchema = new Schema<IAuditLog>({
  userId: { type: String },
  action: { type: String, required: true },
  details: { type: String, required: true },
}, { timestamps: true });

export const AuditLogModel = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

// Offer Schema
export interface IOffer extends Document {
  patentId: string;
  buyerId: string;
  ownerId: string;
  price: number;
  type: 'sale' | 'license';
  status: 'pending' | 'accepted' | 'declined' | 'countered';
  milestones: string[];
  counterPrice?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const OfferSchema = new Schema<IOffer>({
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

export const OfferModel = mongoose.models.Offer || mongoose.model<IOffer>('Offer', OfferSchema);

// NDA Signature Schema
export interface INDASignature extends Document {
  patentId: string;
  buyerId: string;
  fullName: string;
  aadhaarNumber: string;
  ipAddress: string;
  signedAt: Date;
}

export const NDASignatureSchema = new Schema<INDASignature>({
  patentId: { type: String, required: true, index: true },
  buyerId: { type: String, required: true, index: true },
  fullName: { type: String, required: true },
  aadhaarNumber: { type: String, required: true },
  ipAddress: { type: String, required: true },
  signedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export const NDASignatureModel = mongoose.models.NDASignature || mongoose.model<INDASignature>('NDASignature', NDASignatureSchema);

// Access Request Schema
export interface IAccessRequest extends Document {
  patentId: string;
  buyerId: string;
  ownerId: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

export const AccessRequestSchema = new Schema<IAccessRequest>({
  patentId: { type: String, required: true, index: true },
  buyerId: { type: String, required: true, index: true },
  ownerId: { type: String, required: true, index: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true }
}, { timestamps: true });

export const AccessRequestModel = mongoose.models.AccessRequest || mongoose.model<IAccessRequest>('AccessRequest', AccessRequestSchema);

// Transaction Schema
export interface ITransaction extends Document {
  offerId: string;
  patentId: string;
  buyerId: string;
  ownerId: string;
  amount: number;
  commissionAmount: number;
  netPayout: number;
  status: 'escrow_pending' | 'escrow_funded' | 'completed' | 'disputed';
  paymentId?: string;
  milestones: {
    description: string;
    percentage: number;
    amount: number;
    status: 'pending' | 'released' | 'disputed';
    releasedAt?: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

export const TransactionSchema = new Schema<ITransaction>({
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

export const TransactionModel = mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', TransactionSchema);
