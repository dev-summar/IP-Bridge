import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { dbStore } from '../services/dbStore';
import { JWT_SECRET, IAuthRequest } from '../middleware/auth';

// Seed initial users if none exist
export async function seedInitialUsers() {
  try {
    const users = await dbStore.users.find();
    
    // In-place database migration to update Sarah Jenkins or Prof. Ankur Gupta to Prof. Ankur Gupta with organization MIET
    const targetUser = users.find(u => u.email === 'owner@patentbridge.com');
    if (targetUser && (targetUser.name.includes('Sarah Jenkins') || targetUser.organization !== 'MIET' || targetUser.name !== 'Prof. Ankur Gupta (Inventor)')) {
      console.log('[Auth] Database migration: Updating Owner User records to Prof. Ankur Gupta and organization MIET...');
      await dbStore.users.update(targetUser._id, {
        name: 'Prof. Ankur Gupta (Inventor)',
        organization: 'MIET'
      });
    }

    const adminUser = users.find(u => u.email === 'admin@patentbridge.com');
    if (adminUser && adminUser.name !== 'Rajesh Sharma (Admin)') {
      console.log('[Auth] Database migration: Updating Admin User to Rajesh Sharma...');
      await dbStore.users.update(adminUser._id, {
        name: 'Rajesh Sharma (Admin)',
        organization: 'PatentBridge India'
      });
    }

    const buyerUser = users.find(u => u.email === 'buyer@patentbridge.com');
    if (buyerUser && buyerUser.name !== 'Vikram Malhotra (Corporate Acquirer)') {
      console.log('[Auth] Database migration: Updating Buyer User to Vikram Malhotra...');
      await dbStore.users.update(buyerUser._id, {
        name: 'Vikram Malhotra (Corporate Acquirer)',
        organization: 'Tata Innovation Labs'
      });
    }

    if (users.length === 0) {
      console.log('[Auth] Seeding demo accounts...');
      
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('password123', salt);
      
      // 1. Admin
      await dbStore.users.create({
        name: 'Rajesh Sharma (Admin)',
        email: 'admin@patentbridge.com',
        passwordHash,
        organization: 'PatentBridge India',
        role: 'admin'
      });

      // 2. Patent Owner
      await dbStore.users.create({
        name: 'Prof. Ankur Gupta (Inventor)',
        email: 'owner@patentbridge.com',
        passwordHash,
        organization: 'MIET',
        role: 'owner'
      });

      // 3. Buyer
      await dbStore.users.create({
        name: 'Vikram Malhotra (Corporate Acquirer)',
        email: 'buyer@patentbridge.com',
        passwordHash,
        organization: 'Tata Innovation Labs',
        role: 'buyer'
      });
      
      console.log('[Auth] Demo accounts seeded successfully:');
      console.log('  - Admin: admin@patentbridge.com (password123)');
      console.log('  - Owner: owner@patentbridge.com (password123)');
      console.log('  - Buyer: buyer@patentbridge.com (password123)');
    }
  } catch (err) {
    console.error('[Auth] Error seeding users:', err);
  }
}

export async function register(req: Request, res: Response) {
  try {
    const { name, email, password, organization, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Missing required registration fields.' });
    }

    if (!['admin', 'owner', 'buyer'].includes(role)) {
      return res.status(400).json({ message: 'Invalid registration role.' });
    }

    const existingUser = await dbStore.users.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'Email address already registered.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await dbStore.users.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      organization,
      role
    });

    // Generate JWT
    const token = jwt.sign(
      { id: newUser._id, role: newUser.role, email: newUser.email, name: newUser.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

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

  } catch (error: any) {
    return res.status(500).json({ message: 'Registration failed.', error: error.message });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await dbStore.users.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

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

  } catch (error: any) {
    return res.status(500).json({ message: 'Login failed.', error: error.message });
  }
}

export async function getMe(req: Request, res: Response) {
  try {
    const authReq = req as IAuthRequest;
    if (!authReq.user) {
      return res.status(401).json({ message: 'Not authenticated.' });
    }

    const user = await dbStore.users.findById(authReq.user.id);
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

  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to fetch profile.', error: error.message });
  }
}

export async function getAllUsers(req: Request, res: Response) {
  try {
    const list = await dbStore.users.find();
    const sanitised = list.map(u => ({
      id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      organization: u.organization,
      createdAt: u.createdAt
    }));
    return res.json(sanitised);
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to fetch users list.', error: error.message });
  }
}
