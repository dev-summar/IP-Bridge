"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedInitialUsers = seedInitialUsers;
exports.register = register;
exports.login = login;
exports.getMe = getMe;
exports.getAllUsers = getAllUsers;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dbStore_1 = require("../services/dbStore");
const auth_1 = require("../middleware/auth");
// Seed initial users if none exist
async function seedInitialUsers() {
    try {
        const users = await dbStore_1.dbStore.users.find();
        // In-place database migration to update Sarah Jenkins or Prof. Ankur Gupta to Prof. Ankur Gupta with organization MIET
        const targetUser = users.find(u => u.email === 'owner@patentbridge.com');
        if (targetUser && (targetUser.name.includes('Sarah Jenkins') || targetUser.organization !== 'MIET' || targetUser.name !== 'Prof. Ankur Gupta (Inventor)')) {
            console.log('[Auth] Database migration: Updating Owner User records to Prof. Ankur Gupta and organization MIET...');
            await dbStore_1.dbStore.users.update(targetUser._id, {
                name: 'Prof. Ankur Gupta (Inventor)',
                organization: 'MIET'
            });
        }
        if (users.length === 0) {
            console.log('[Auth] Seeding demo accounts...');
            const salt = await bcryptjs_1.default.genSalt(10);
            const passwordHash = await bcryptjs_1.default.hash('password123', salt);
            // 1. Admin
            await dbStore_1.dbStore.users.create({
                name: 'Alex Rivera (Admin)',
                email: 'admin@patentbridge.com',
                passwordHash,
                organization: 'PatentBridge Corp',
                role: 'admin'
            });
            // 2. Patent Owner
            await dbStore_1.dbStore.users.create({
                name: 'Prof. Ankur Gupta (Inventor)',
                email: 'owner@patentbridge.com',
                passwordHash,
                organization: 'MIET',
                role: 'owner'
            });
            // 3. Buyer
            await dbStore_1.dbStore.users.create({
                name: 'David Chen (Corporate Dev)',
                email: 'buyer@patentbridge.com',
                passwordHash,
                organization: 'Apex Ventures',
                role: 'buyer'
            });
            console.log('[Auth] Demo accounts seeded successfully:');
            console.log('  - Admin: admin@patentbridge.com (password123)');
            console.log('  - Owner: owner@patentbridge.com (password123)');
            console.log('  - Buyer: buyer@patentbridge.com (password123)');
        }
    }
    catch (err) {
        console.error('[Auth] Error seeding users:', err);
    }
}
async function register(req, res) {
    try {
        const { name, email, password, organization, role } = req.body;
        if (!name || !email || !password || !role) {
            return res.status(400).json({ message: 'Missing required registration fields.' });
        }
        if (!['admin', 'owner', 'buyer'].includes(role)) {
            return res.status(400).json({ message: 'Invalid registration role.' });
        }
        const existingUser = await dbStore_1.dbStore.users.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ message: 'Email address already registered.' });
        }
        const salt = await bcryptjs_1.default.genSalt(10);
        const passwordHash = await bcryptjs_1.default.hash(password, salt);
        const newUser = await dbStore_1.dbStore.users.create({
            name,
            email: email.toLowerCase(),
            passwordHash,
            organization,
            role
        });
        // Generate JWT
        const token = jsonwebtoken_1.default.sign({ id: newUser._id, role: newUser.role, email: newUser.email, name: newUser.name }, auth_1.JWT_SECRET, { expiresIn: '24h' });
        return res.status(201).json({
            message: 'Account registered successfully',
            token,
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                organization: newUser.organization
            }
        });
    }
    catch (error) {
        return res.status(500).json({ message: 'Registration failed.', error: error.message });
    }
}
async function login(req, res) {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }
        const user = await dbStore_1.dbStore.users.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }
        // Generate JWT
        const token = jsonwebtoken_1.default.sign({ id: user._id, role: user.role, email: user.email, name: user.name }, auth_1.JWT_SECRET, { expiresIn: '24h' });
        return res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                organization: user.organization,
                savedPatents: user.savedPatents || []
            }
        });
    }
    catch (error) {
        return res.status(500).json({ message: 'Login failed.', error: error.message });
    }
}
async function getMe(req, res) {
    try {
        const authReq = req;
        if (!authReq.user) {
            return res.status(401).json({ message: 'Not authenticated.' });
        }
        const user = await dbStore_1.dbStore.users.findById(authReq.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        return res.json({
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            organization: user.organization,
            savedPatents: user.savedPatents || []
        });
    }
    catch (error) {
        return res.status(500).json({ message: 'Failed to fetch profile.', error: error.message });
    }
}
async function getAllUsers(req, res) {
    try {
        const list = await dbStore_1.dbStore.users.find();
        const sanitised = list.map(u => ({
            id: u._id,
            name: u.name,
            email: u.email,
            role: u.role,
            organization: u.organization,
            createdAt: u.createdAt
        }));
        return res.json(sanitised);
    }
    catch (error) {
        return res.status(500).json({ message: 'Failed to fetch users list.', error: error.message });
    }
}
