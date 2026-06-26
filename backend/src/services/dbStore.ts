import fs from 'fs';
import path from 'path';
import { 
  UserModel, PatentModel, PatentAnalysisModel, 
  InterestRequestModel, MeetingRequestModel, AuditLogModel, OfferModel, NDASignatureModel, TransactionModel, AccessRequestModel,
  IUser, IPatent, IPatentAnalysis, IInterestRequest, IMeetingRequest, IAuditLog, IOffer, INDASignature, ITransaction, IAccessRequest
} from '../models/schemas';

// Local storage path for JSON fallback
const DATA_DIR = path.join(__dirname, '../../data');
const JSON_DB_PATH = path.join(DATA_DIR, 'db.json');

// Global connection mode flag
let useMongo = false;

export function setUseMongo(val: boolean) {
  useMongo = val;
  console.log(`[dbStore] Database store set to use: ${val ? 'MongoDB' : 'JSON Fallback File'}`);
}

export function getUseMongo(): boolean {
  return useMongo;
}

// Initial structure for local JSON database
interface ILocalDB {
  users: any[];
  patents: any[];
  patentAnalysis: any[];
  interestRequests: any[];
  meetingRequests: any[];
  auditLogs: any[];
  offers: any[];
  ndaSignatures: any[];
  transactions: any[];
  accessRequests: any[];
}

const emptyDB: ILocalDB = {
  users: [],
  patents: [],
  patentAnalysis: [],
  interestRequests: [],
  meetingRequests: [],
  auditLogs: [],
  offers: [],
  ndaSignatures: [],
  transactions: [],
  accessRequests: []
};

// Helper functions to read/write JSON file
function readJSON(): ILocalDB {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(JSON_DB_PATH)) {
    fs.writeFileSync(JSON_DB_PATH, JSON.stringify(emptyDB, null, 2), 'utf8');
    return emptyDB;
  }
  try {
    const content = fs.readFileSync(JSON_DB_PATH, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    console.error('[dbStore] Error reading JSON DB file, returning empty:', err);
    return emptyDB;
  }
}

function writeJSON(data: ILocalDB) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  try {
    fs.writeFileSync(JSON_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('[dbStore] Error writing JSON DB file:', err);
  }
}

// Generate unique string ID for JSON fallback
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Normalized Data Repositories
export const dbStore = {
  users: {
    async find(filter: any = {}): Promise<any[]> {
      if (useMongo) {
        return await UserModel.find(filter).lean();
      }
      const db = readJSON();
      return db.users.filter(u => {
        for (const key in filter) {
          if (u[key] !== filter[key]) return false;
        }
        return true;
      });
    },

    async findOne(filter: any): Promise<any | null> {
      if (useMongo) {
        return await UserModel.findOne(filter).lean();
      }
      const list = await this.find(filter);
      return list.length > 0 ? list[0] : null;
    },

    async findById(id: string): Promise<any | null> {
      if (useMongo) {
        return await UserModel.findById(id).lean();
      }
      const db = readJSON();
      return db.users.find(u => u._id === id) || null;
    },

    async create(data: any): Promise<any> {
      if (useMongo) {
        const user = new UserModel(data);
        return await user.save();
      }
      const db = readJSON();
      const newUser = {
        _id: generateId(),
        ...data,
        savedPatents: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      db.users.push(newUser);
      writeJSON(db);
      return newUser;
    },

    async update(id: string, updateData: any): Promise<any | null> {
      if (useMongo) {
        return await UserModel.findByIdAndUpdate(id, updateData, { new: true }).lean();
      }
      const db = readJSON();
      const idx = db.users.findIndex(u => u._id === id);
      if (idx === -1) return null;
      db.users[idx] = {
        ...db.users[idx],
        ...updateData,
        updatedAt: new Date()
      };
      writeJSON(db);
      return db.users[idx];
    }
  },

  patents: {
    async find(filter: any = {}): Promise<any[]> {
      if (useMongo) {
        return await PatentModel.find(filter).lean();
      }
      const db = readJSON();
      return db.patents.filter(p => {
        for (const key in filter) {
          if (filter[key] !== undefined) {
            if (uContains(p[key], filter[key])) continue;
            return false;
          }
        }
        return true;
      });
      
      function uContains(val: any, target: any) {
        if (typeof val === 'string' && typeof target === 'string') {
          return val.toLowerCase().includes(target.toLowerCase());
        }
        return val === target;
      }
    },

    async findById(id: string): Promise<any | null> {
      if (useMongo) {
        return await PatentModel.findById(id).lean();
      }
      const db = readJSON();
      return db.patents.find(p => p._id === id) || null;
    },

    async create(data: any): Promise<any> {
      if (useMongo) {
        const patent = new PatentModel(data);
        return await patent.save();
      }
      const db = readJSON();
      const newPatent = {
        _id: generateId(),
        ...data,
        status: data.status || 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      db.patents.push(newPatent);
      writeJSON(db);
      return newPatent;
    },

    async update(id: string, updateData: any): Promise<any | null> {
      if (useMongo) {
        return await PatentModel.findByIdAndUpdate(id, updateData, { new: true }).lean();
      }
      const db = readJSON();
      const idx = db.patents.findIndex(p => p._id === id);
      if (idx === -1) return null;
      db.patents[idx] = {
        ...db.patents[idx],
        ...updateData,
        updatedAt: new Date()
      };
      writeJSON(db);
      return db.patents[idx];
    },

    async delete(id: string): Promise<boolean> {
      if (useMongo) {
        await OfferModel.deleteMany({ patentId: id });
        await NDASignatureModel.deleteMany({ patentId: id });
        await TransactionModel.deleteMany({ patentId: id });
        await AccessRequestModel.deleteMany({ patentId: id });
        const res = await PatentModel.findByIdAndDelete(id);
        return res !== null;
      }
      const db = readJSON();
      const initialLength = db.patents.length;
      db.patents = db.patents.filter(p => p._id !== id);
      db.patentAnalysis = db.patentAnalysis.filter(pa => pa.patentId !== id);
      db.interestRequests = db.interestRequests.filter(ir => ir.patentId !== id);
      db.meetingRequests = db.meetingRequests.filter(mr => mr.patentId !== id);
      if (db.offers) {
        db.offers = db.offers.filter(o => o.patentId !== id);
      }
      if (db.ndaSignatures) {
        db.ndaSignatures = db.ndaSignatures.filter(nda => nda.patentId !== id);
      }
      if (db.transactions) {
        db.transactions = db.transactions.filter(t => t.patentId !== id);
      }
      if (db.accessRequests) {
        db.accessRequests = db.accessRequests.filter(ar => ar.patentId !== id);
      }
      writeJSON(db);
      return db.patents.length < initialLength;
    }
  },

  patentAnalysis: {
    async findOne(filter: any): Promise<any | null> {
      if (useMongo) {
        if (filter.patentId) {
          const patentId = String(filter.patentId);
          return await PatentAnalysisModel.findOne({
            $or: [{ patentId }, { patentId: filter.patentId }]
          }).lean();
        }
        return await PatentAnalysisModel.findOne(filter).lean();
      }
      const db = readJSON();
      const patentId = filter.patentId ? String(filter.patentId) : null;
      return db.patentAnalysis.find(pa => {
        if (patentId && String(pa.patentId) !== patentId) return false;
        for (const key in filter) {
          if (key === 'patentId') continue;
          if (pa[key] !== filter[key]) return false;
        }
        return patentId ? String(pa.patentId) === patentId : true;
      }) || null;
    },

    async create(data: any): Promise<any> {
      if (useMongo) {
        const pa = new PatentAnalysisModel({ ...data, patentId: String(data.patentId) });
        return await pa.save();
      }
      const db = readJSON();
      const newPA = {
        _id: generateId(),
        ...data,
        patentId: String(data.patentId),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      db.patentAnalysis.push(newPA);
      writeJSON(db);
      return newPA;
    },

    async upsert(patentId: string, data: any): Promise<any> {
      const id = String(patentId);
      const existing = await this.findOne({ patentId: id });

      if (useMongo) {
        if (existing) {
          return await PatentAnalysisModel.findOneAndUpdate(
            { patentId: id },
            { $set: { ...data, patentId: id, updatedAt: new Date() } },
            { new: true }
          ).lean();
        }
        const pa = new PatentAnalysisModel({ patentId: id, ...data });
        return await pa.save();
      }

      const db = readJSON();
      const idx = db.patentAnalysis.findIndex((pa: any) => String(pa.patentId) === id);
      if (idx >= 0) {
        db.patentAnalysis[idx] = {
          ...db.patentAnalysis[idx],
          ...data,
          patentId: id,
          updatedAt: new Date()
        };
        writeJSON(db);
        return db.patentAnalysis[idx];
      }
      const newPA = {
        _id: generateId(),
        patentId: id,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      db.patentAnalysis.push(newPA);
      writeJSON(db);
      return newPA;
    },

    async deleteByPatentId(patentId: string): Promise<void> {
      const id = String(patentId);
      if (useMongo) {
        await PatentAnalysisModel.deleteMany({ patentId: id });
        return;
      }
      const db = readJSON();
      db.patentAnalysis = db.patentAnalysis.filter((pa: any) => String(pa.patentId) !== id);
      writeJSON(db);
    }
  },

  interestRequests: {
    async find(filter: any = {}): Promise<any[]> {
      if (useMongo) {
        return await InterestRequestModel.find(filter).sort({ createdAt: -1 }).lean();
      }
      const db = readJSON();
      return db.interestRequests.filter(ir => {
        for (const key in filter) {
          if (ir[key] !== filter[key]) return false;
        }
        return true;
      }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },

    async findById(id: string): Promise<any | null> {
      if (useMongo) {
        return await InterestRequestModel.findById(id).lean();
      }
      const db = readJSON();
      return db.interestRequests.find(ir => ir._id === id) || null;
    },

    async create(data: any): Promise<any> {
      if (useMongo) {
        const ir = new InterestRequestModel(data);
        return await ir.save();
      }
      const db = readJSON();
      const newIR = {
        _id: generateId(),
        ...data,
        status: 'new',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      db.interestRequests.push(newIR);
      writeJSON(db);
      return newIR;
    },

    async update(id: string, updateData: any): Promise<any | null> {
      if (useMongo) {
        return await InterestRequestModel.findByIdAndUpdate(id, updateData, { new: true }).lean();
      }
      const db = readJSON();
      const idx = db.interestRequests.findIndex(ir => ir._id === id);
      if (idx === -1) return null;
      db.interestRequests[idx] = {
        ...db.interestRequests[idx],
        ...updateData,
        updatedAt: new Date()
      };
      writeJSON(db);
      return db.interestRequests[idx];
    }
  },

  meetingRequests: {
    async find(filter: any = {}): Promise<any[]> {
      if (useMongo) {
        return await MeetingRequestModel.find(filter).sort({ createdAt: -1 }).lean();
      }
      const db = readJSON();
      return db.meetingRequests.filter(mr => {
        for (const key in filter) {
          if (mr[key] !== filter[key]) return false;
        }
        return true;
      }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },

    async findById(id: string): Promise<any | null> {
      if (useMongo) {
        return await MeetingRequestModel.findById(id).lean();
      }
      const db = readJSON();
      return db.meetingRequests.find(mr => mr._id === id) || null;
    },

    async create(data: any): Promise<any> {
      if (useMongo) {
        const mr = new MeetingRequestModel(data);
        return await mr.save();
      }
      const db = readJSON();
      const newMR = {
        _id: generateId(),
        ...data,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      db.meetingRequests.push(newMR);
      writeJSON(db);
      return newMR;
    },

    async update(id: string, updateData: any): Promise<any | null> {
      if (useMongo) {
        return await MeetingRequestModel.findByIdAndUpdate(id, updateData, { new: true }).lean();
      }
      const db = readJSON();
      const idx = db.meetingRequests.findIndex(mr => mr._id === id);
      if (idx === -1) return null;
      db.meetingRequests[idx] = {
        ...db.meetingRequests[idx],
        ...updateData,
        updatedAt: new Date()
      };
      writeJSON(db);
      return db.meetingRequests[idx];
    }
  },

  auditLogs: {
    async find(filter: any = {}): Promise<any[]> {
      if (useMongo) {
        return await AuditLogModel.find(filter).sort({ createdAt: -1 }).lean();
      }
      const db = readJSON();
      return db.auditLogs.filter(al => {
        for (const key in filter) {
          if (al[key] !== filter[key]) return false;
        }
        return true;
      }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },

    async create(data: any): Promise<any> {
      if (useMongo) {
        const al = new AuditLogModel(data);
        return await al.save();
      }
      const db = readJSON();
      const newLog = {
        _id: generateId(),
        ...data,
        createdAt: new Date()
      };
      db.auditLogs.push(newLog);
      writeJSON(db);
      return newLog;
    }
  },
  
  offers: {
    async find(filter: any = {}): Promise<any[]> {
      if (useMongo) {
        return await OfferModel.find(filter).sort({ createdAt: -1 }).lean();
      }
      const db = readJSON();
      return (db.offers || []).filter(o => {
        for (const key in filter) {
          if (o[key] !== filter[key]) return false;
        }
        return true;
      }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },

    async findById(id: string): Promise<any | null> {
      if (useMongo) {
        return await OfferModel.findById(id).lean();
      }
      const db = readJSON();
      return (db.offers || []).find(o => o._id === id) || null;
    },

    async create(data: any): Promise<any> {
      if (useMongo) {
        const offer = new OfferModel(data);
        return await offer.save();
      }
      const db = readJSON();
      if (!db.offers) db.offers = [];
      const newOffer = {
        _id: generateId(),
        ...data,
        status: data.status || 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      db.offers.push(newOffer);
      writeJSON(db);
      return newOffer;
    },

    async update(id: string, updateData: any): Promise<any | null> {
      if (useMongo) {
        return await OfferModel.findByIdAndUpdate(id, updateData, { new: true }).lean();
      }
      const db = readJSON();
      if (!db.offers) db.offers = [];
      const idx = db.offers.findIndex(o => o._id === id);
      if (idx === -1) return null;
      db.offers[idx] = {
        ...db.offers[idx],
        ...updateData,
        updatedAt: new Date()
      };
      writeJSON(db);
      return db.offers[idx];
    }
  },
  
  ndaSignatures: {
    async find(filter: any = {}): Promise<any[]> {
      if (useMongo) {
        return await NDASignatureModel.find(filter).sort({ createdAt: -1 }).lean();
      }
      const db = readJSON();
      return (db.ndaSignatures || []).filter(nda => {
        for (const key in filter) {
          if (nda[key] !== filter[key]) return false;
        }
        return true;
      }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },

    async findOne(filter: any): Promise<any | null> {
      if (useMongo) {
        return await NDASignatureModel.findOne(filter).lean();
      }
      const list = await this.find(filter);
      return list.length > 0 ? list[0] : null;
    },

    async create(data: any): Promise<any> {
      if (useMongo) {
        const nda = new NDASignatureModel(data);
        return await nda.save();
      }
      const db = readJSON();
      if (!db.ndaSignatures) db.ndaSignatures = [];
      const newNDA = {
        _id: generateId(),
        ...data,
        signedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      db.ndaSignatures.push(newNDA);
      writeJSON(db);
      return newNDA;
    },

    async delete(id: string): Promise<boolean> {
      if (useMongo) {
        const res = await NDASignatureModel.findByIdAndDelete(id);
        return res !== null;
      }
      const db = readJSON();
      if (!db.ndaSignatures) db.ndaSignatures = [];
      const initialLength = db.ndaSignatures.length;
      db.ndaSignatures = db.ndaSignatures.filter(nda => nda._id !== id);
      writeJSON(db);
      return db.ndaSignatures.length < initialLength;
    }
  },

  transactions: {
    async find(filter: any = {}): Promise<any[]> {
      if (useMongo) {
        return await TransactionModel.find(filter).sort({ createdAt: -1 }).lean();
      }
      const db = readJSON();
      return (db.transactions || []).filter(t => {
        for (const key in filter) {
          if (t[key] !== filter[key]) return false;
        }
        return true;
      }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },

    async findById(id: string): Promise<any | null> {
      if (useMongo) {
        return await TransactionModel.findById(id).lean();
      }
      const db = readJSON();
      return (db.transactions || []).find(t => t._id === id) || null;
    },

    async findOne(filter: any): Promise<any | null> {
      const list = await this.find(filter);
      return list.length > 0 ? list[0] : null;
    },

    async create(data: any): Promise<any> {
      if (useMongo) {
        const trans = new TransactionModel(data);
        return await trans.save();
      }
      const db = readJSON();
      if (!db.transactions) db.transactions = [];
      const newTrans = {
        _id: generateId(),
        ...data,
        status: data.status || 'escrow_pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      db.transactions.push(newTrans);
      writeJSON(db);
      return newTrans;
    },

    async update(id: string, updateData: any): Promise<any | null> {
      if (useMongo) {
        return await TransactionModel.findByIdAndUpdate(id, updateData, { new: true }).lean();
      }
      const db = readJSON();
      if (!db.transactions) db.transactions = [];
      const idx = db.transactions.findIndex(t => t._id === id);
      if (idx === -1) return null;
      db.transactions[idx] = {
        ...db.transactions[idx],
        ...updateData,
        updatedAt: new Date()
      };
      writeJSON(db);
      return db.transactions[idx];
    }
  },

  accessRequests: {
    async find(filter: any = {}): Promise<any[]> {
      if (useMongo) {
        return await AccessRequestModel.find(filter).sort({ createdAt: -1 }).lean();
      }
      const db = readJSON();
      return (db.accessRequests || []).filter(ar => {
        for (const key in filter) {
          if (ar[key] !== filter[key]) return false;
        }
        return true;
      }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },

    async findById(id: string): Promise<any | null> {
      if (useMongo) {
        return await AccessRequestModel.findById(id).lean();
      }
      const db = readJSON();
      return (db.accessRequests || []).find(ar => ar._id === id) || null;
    },

    async findOne(filter: any): Promise<any | null> {
      if (useMongo) {
        return await AccessRequestModel.findOne(filter).lean();
      }
      const list = await this.find(filter);
      return list.length > 0 ? list[0] : null;
    },

    async create(data: any): Promise<any> {
      if (useMongo) {
        const ar = new AccessRequestModel(data);
        return await ar.save();
      }
      const db = readJSON();
      if (!db.accessRequests) db.accessRequests = [];
      const newAR = {
        _id: generateId(),
        ...data,
        status: data.status || 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      db.accessRequests.push(newAR);
      writeJSON(db);
      return newAR;
    },

    async update(id: string, updateData: any): Promise<any | null> {
      if (useMongo) {
        return await AccessRequestModel.findByIdAndUpdate(id, updateData, { new: true }).lean();
      }
      const db = readJSON();
      if (!db.accessRequests) db.accessRequests = [];
      const idx = db.accessRequests.findIndex(ar => ar._id === id);
      if (idx === -1) return null;
      db.accessRequests[idx] = {
        ...db.accessRequests[idx],
        ...updateData,
        updatedAt: new Date()
      };
      writeJSON(db);
      return db.accessRequests[idx];
    },

    async delete(id: string): Promise<boolean> {
      if (useMongo) {
        const res = await AccessRequestModel.findByIdAndDelete(id);
        return res !== null;
      }
      const db = readJSON();
      if (!db.accessRequests) db.accessRequests = [];
      const initialLength = db.accessRequests.length;
      db.accessRequests = db.accessRequests.filter(ar => ar._id !== id);
      writeJSON(db);
      return db.accessRequests.length < initialLength;
    }
  }
};
