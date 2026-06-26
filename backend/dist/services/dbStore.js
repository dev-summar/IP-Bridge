"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbStore = void 0;
exports.setUseMongo = setUseMongo;
exports.getUseMongo = getUseMongo;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const schemas_1 = require("../models/schemas");
// Local storage path for JSON fallback
const DATA_DIR = path_1.default.join(__dirname, '../../data');
const JSON_DB_PATH = path_1.default.join(DATA_DIR, 'db.json');
// Global connection mode flag
let useMongo = false;
function setUseMongo(val) {
    useMongo = val;
    console.log(`[dbStore] Database store set to use: ${val ? 'MongoDB' : 'JSON Fallback File'}`);
}
function getUseMongo() {
    return useMongo;
}
const emptyDB = {
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
function readJSON() {
    if (!fs_1.default.existsSync(DATA_DIR)) {
        fs_1.default.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs_1.default.existsSync(JSON_DB_PATH)) {
        fs_1.default.writeFileSync(JSON_DB_PATH, JSON.stringify(emptyDB, null, 2), 'utf8');
        return emptyDB;
    }
    try {
        const content = fs_1.default.readFileSync(JSON_DB_PATH, 'utf8');
        return JSON.parse(content);
    }
    catch (err) {
        console.error('[dbStore] Error reading JSON DB file, returning empty:', err);
        return emptyDB;
    }
}
function writeJSON(data) {
    if (!fs_1.default.existsSync(DATA_DIR)) {
        fs_1.default.mkdirSync(DATA_DIR, { recursive: true });
    }
    try {
        fs_1.default.writeFileSync(JSON_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    }
    catch (err) {
        console.error('[dbStore] Error writing JSON DB file:', err);
    }
}
// Generate unique string ID for JSON fallback
function generateId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
// Normalized Data Repositories
exports.dbStore = {
    users: {
        async find(filter = {}) {
            if (useMongo) {
                return await schemas_1.UserModel.find(filter).lean();
            }
            const db = readJSON();
            return db.users.filter(u => {
                for (const key in filter) {
                    if (u[key] !== filter[key])
                        return false;
                }
                return true;
            });
        },
        async findOne(filter) {
            if (useMongo) {
                return await schemas_1.UserModel.findOne(filter).lean();
            }
            const list = await this.find(filter);
            return list.length > 0 ? list[0] : null;
        },
        async findById(id) {
            if (useMongo) {
                return await schemas_1.UserModel.findById(id).lean();
            }
            const db = readJSON();
            return db.users.find(u => u._id === id) || null;
        },
        async create(data) {
            if (useMongo) {
                const user = new schemas_1.UserModel(data);
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
        async update(id, updateData) {
            if (useMongo) {
                return await schemas_1.UserModel.findByIdAndUpdate(id, updateData, { new: true }).lean();
            }
            const db = readJSON();
            const idx = db.users.findIndex(u => u._id === id);
            if (idx === -1)
                return null;
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
        async find(filter = {}) {
            if (useMongo) {
                return await schemas_1.PatentModel.find(filter).lean();
            }
            const db = readJSON();
            return db.patents.filter(p => {
                for (const key in filter) {
                    if (filter[key] !== undefined) {
                        if (uContains(p[key], filter[key]))
                            continue;
                        return false;
                    }
                }
                return true;
            });
            function uContains(val, target) {
                if (typeof val === 'string' && typeof target === 'string') {
                    return val.toLowerCase().includes(target.toLowerCase());
                }
                return val === target;
            }
        },
        async findById(id) {
            if (useMongo) {
                return await schemas_1.PatentModel.findById(id).lean();
            }
            const db = readJSON();
            return db.patents.find(p => p._id === id) || null;
        },
        async create(data) {
            if (useMongo) {
                const patent = new schemas_1.PatentModel(data);
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
        async update(id, updateData) {
            if (useMongo) {
                return await schemas_1.PatentModel.findByIdAndUpdate(id, updateData, { new: true }).lean();
            }
            const db = readJSON();
            const idx = db.patents.findIndex(p => p._id === id);
            if (idx === -1)
                return null;
            db.patents[idx] = {
                ...db.patents[idx],
                ...updateData,
                updatedAt: new Date()
            };
            writeJSON(db);
            return db.patents[idx];
        },
        async delete(id) {
            if (useMongo) {
                await schemas_1.OfferModel.deleteMany({ patentId: id });
                await schemas_1.NDASignatureModel.deleteMany({ patentId: id });
                await schemas_1.TransactionModel.deleteMany({ patentId: id });
                await schemas_1.AccessRequestModel.deleteMany({ patentId: id });
                const res = await schemas_1.PatentModel.findByIdAndDelete(id);
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
        async findOne(filter) {
            if (useMongo) {
                return await schemas_1.PatentAnalysisModel.findOne(filter).lean();
            }
            const db = readJSON();
            return db.patentAnalysis.find(pa => {
                for (const key in filter) {
                    if (pa[key] !== filter[key])
                        return false;
                }
                return true;
            }) || null;
        },
        async create(data) {
            if (useMongo) {
                const pa = new schemas_1.PatentAnalysisModel(data);
                return await pa.save();
            }
            const db = readJSON();
            const newPA = {
                _id: generateId(),
                ...data,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            db.patentAnalysis.push(newPA);
            writeJSON(db);
            return newPA;
        }
    },
    interestRequests: {
        async find(filter = {}) {
            if (useMongo) {
                return await schemas_1.InterestRequestModel.find(filter).sort({ createdAt: -1 }).lean();
            }
            const db = readJSON();
            return db.interestRequests.filter(ir => {
                for (const key in filter) {
                    if (ir[key] !== filter[key])
                        return false;
                }
                return true;
            }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        },
        async findById(id) {
            if (useMongo) {
                return await schemas_1.InterestRequestModel.findById(id).lean();
            }
            const db = readJSON();
            return db.interestRequests.find(ir => ir._id === id) || null;
        },
        async create(data) {
            if (useMongo) {
                const ir = new schemas_1.InterestRequestModel(data);
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
        async update(id, updateData) {
            if (useMongo) {
                return await schemas_1.InterestRequestModel.findByIdAndUpdate(id, updateData, { new: true }).lean();
            }
            const db = readJSON();
            const idx = db.interestRequests.findIndex(ir => ir._id === id);
            if (idx === -1)
                return null;
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
        async find(filter = {}) {
            if (useMongo) {
                return await schemas_1.MeetingRequestModel.find(filter).sort({ createdAt: -1 }).lean();
            }
            const db = readJSON();
            return db.meetingRequests.filter(mr => {
                for (const key in filter) {
                    if (mr[key] !== filter[key])
                        return false;
                }
                return true;
            }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        },
        async findById(id) {
            if (useMongo) {
                return await schemas_1.MeetingRequestModel.findById(id).lean();
            }
            const db = readJSON();
            return db.meetingRequests.find(mr => mr._id === id) || null;
        },
        async create(data) {
            if (useMongo) {
                const mr = new schemas_1.MeetingRequestModel(data);
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
        async update(id, updateData) {
            if (useMongo) {
                return await schemas_1.MeetingRequestModel.findByIdAndUpdate(id, updateData, { new: true }).lean();
            }
            const db = readJSON();
            const idx = db.meetingRequests.findIndex(mr => mr._id === id);
            if (idx === -1)
                return null;
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
        async find(filter = {}) {
            if (useMongo) {
                return await schemas_1.AuditLogModel.find(filter).sort({ createdAt: -1 }).lean();
            }
            const db = readJSON();
            return db.auditLogs.filter(al => {
                for (const key in filter) {
                    if (al[key] !== filter[key])
                        return false;
                }
                return true;
            }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        },
        async create(data) {
            if (useMongo) {
                const al = new schemas_1.AuditLogModel(data);
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
        async find(filter = {}) {
            if (useMongo) {
                return await schemas_1.OfferModel.find(filter).sort({ createdAt: -1 }).lean();
            }
            const db = readJSON();
            return (db.offers || []).filter(o => {
                for (const key in filter) {
                    if (o[key] !== filter[key])
                        return false;
                }
                return true;
            }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        },
        async findById(id) {
            if (useMongo) {
                return await schemas_1.OfferModel.findById(id).lean();
            }
            const db = readJSON();
            return (db.offers || []).find(o => o._id === id) || null;
        },
        async create(data) {
            if (useMongo) {
                const offer = new schemas_1.OfferModel(data);
                return await offer.save();
            }
            const db = readJSON();
            if (!db.offers)
                db.offers = [];
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
        async update(id, updateData) {
            if (useMongo) {
                return await schemas_1.OfferModel.findByIdAndUpdate(id, updateData, { new: true }).lean();
            }
            const db = readJSON();
            if (!db.offers)
                db.offers = [];
            const idx = db.offers.findIndex(o => o._id === id);
            if (idx === -1)
                return null;
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
        async find(filter = {}) {
            if (useMongo) {
                return await schemas_1.NDASignatureModel.find(filter).sort({ createdAt: -1 }).lean();
            }
            const db = readJSON();
            return (db.ndaSignatures || []).filter(nda => {
                for (const key in filter) {
                    if (nda[key] !== filter[key])
                        return false;
                }
                return true;
            }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        },
        async findOne(filter) {
            if (useMongo) {
                return await schemas_1.NDASignatureModel.findOne(filter).lean();
            }
            const list = await this.find(filter);
            return list.length > 0 ? list[0] : null;
        },
        async create(data) {
            if (useMongo) {
                const nda = new schemas_1.NDASignatureModel(data);
                return await nda.save();
            }
            const db = readJSON();
            if (!db.ndaSignatures)
                db.ndaSignatures = [];
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
        async delete(id) {
            if (useMongo) {
                const res = await schemas_1.NDASignatureModel.findByIdAndDelete(id);
                return res !== null;
            }
            const db = readJSON();
            if (!db.ndaSignatures)
                db.ndaSignatures = [];
            const initialLength = db.ndaSignatures.length;
            db.ndaSignatures = db.ndaSignatures.filter(nda => nda._id !== id);
            writeJSON(db);
            return db.ndaSignatures.length < initialLength;
        }
    },
    transactions: {
        async find(filter = {}) {
            if (useMongo) {
                return await schemas_1.TransactionModel.find(filter).sort({ createdAt: -1 }).lean();
            }
            const db = readJSON();
            return (db.transactions || []).filter(t => {
                for (const key in filter) {
                    if (t[key] !== filter[key])
                        return false;
                }
                return true;
            }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        },
        async findById(id) {
            if (useMongo) {
                return await schemas_1.TransactionModel.findById(id).lean();
            }
            const db = readJSON();
            return (db.transactions || []).find(t => t._id === id) || null;
        },
        async findOne(filter) {
            const list = await this.find(filter);
            return list.length > 0 ? list[0] : null;
        },
        async create(data) {
            if (useMongo) {
                const trans = new schemas_1.TransactionModel(data);
                return await trans.save();
            }
            const db = readJSON();
            if (!db.transactions)
                db.transactions = [];
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
        async update(id, updateData) {
            if (useMongo) {
                return await schemas_1.TransactionModel.findByIdAndUpdate(id, updateData, { new: true }).lean();
            }
            const db = readJSON();
            if (!db.transactions)
                db.transactions = [];
            const idx = db.transactions.findIndex(t => t._id === id);
            if (idx === -1)
                return null;
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
        async find(filter = {}) {
            if (useMongo) {
                return await schemas_1.AccessRequestModel.find(filter).sort({ createdAt: -1 }).lean();
            }
            const db = readJSON();
            return (db.accessRequests || []).filter(ar => {
                for (const key in filter) {
                    if (ar[key] !== filter[key])
                        return false;
                }
                return true;
            }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        },
        async findById(id) {
            if (useMongo) {
                return await schemas_1.AccessRequestModel.findById(id).lean();
            }
            const db = readJSON();
            return (db.accessRequests || []).find(ar => ar._id === id) || null;
        },
        async findOne(filter) {
            if (useMongo) {
                return await schemas_1.AccessRequestModel.findOne(filter).lean();
            }
            const list = await this.find(filter);
            return list.length > 0 ? list[0] : null;
        },
        async create(data) {
            if (useMongo) {
                const ar = new schemas_1.AccessRequestModel(data);
                return await ar.save();
            }
            const db = readJSON();
            if (!db.accessRequests)
                db.accessRequests = [];
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
        async update(id, updateData) {
            if (useMongo) {
                return await schemas_1.AccessRequestModel.findByIdAndUpdate(id, updateData, { new: true }).lean();
            }
            const db = readJSON();
            if (!db.accessRequests)
                db.accessRequests = [];
            const idx = db.accessRequests.findIndex(ar => ar._id === id);
            if (idx === -1)
                return null;
            db.accessRequests[idx] = {
                ...db.accessRequests[idx],
                ...updateData,
                updatedAt: new Date()
            };
            writeJSON(db);
            return db.accessRequests[idx];
        },
        async delete(id) {
            if (useMongo) {
                const res = await schemas_1.AccessRequestModel.findByIdAndDelete(id);
                return res !== null;
            }
            const db = readJSON();
            if (!db.accessRequests)
                db.accessRequests = [];
            const initialLength = db.accessRequests.length;
            db.accessRequests = db.accessRequests.filter(ar => ar._id !== id);
            writeJSON(db);
            return db.accessRequests.length < initialLength;
        }
    }
};
