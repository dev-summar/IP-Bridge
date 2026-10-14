import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { dbStore } from '../services/dbStore';
import { JWT_SECRET, IAuthRequest } from '../middleware/auth';

export async function register(req: Request, res: Response) {
  try {
    const { name, email, password, organization, role, interests, domains } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Missing required registration fields.' });
    }

    if (role === 'admin') {
      return res.status(403).json({ message: 'Administrator accounts must be provisioned by an authorized administrator.' });
    }
    if (!['owner', 'buyer'].includes(role)) {
      return res.status(400).json({ message: 'Invalid registration role.' });
    }

    const existingUser = await dbStore.users.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'Email address already registered.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const cleanList = (arr: unknown, max: number) =>
      Array.isArray(arr)
        ? arr.map((x) => String(x).trim()).filter(Boolean).slice(0, max)
        : [];

    const newUser = await dbStore.users.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      organization,
      role,
      interests: cleanList(interests, 30),
      domains: cleanList(domains, 20),
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
        organization: newUser.organization,
        interests: newUser.interests || [],
        domains: newUser.domains || []
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
        interests: user.interests || [],
        domains: user.domains || [],
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
      interests: user.interests || [],
      domains: user.domains || [],
      savedPatents: user.savedPatents || []
    });

  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to fetch profile.', error: error.message });
  }
}

/** PUT /api/auth/profile — update interests/domains for personalized Discover */
export async function updateProfile(req: Request, res: Response) {
  try {
    const authReq = req as IAuthRequest;
    if (!authReq.user) {
      return res.status(401).json({ message: 'Not authenticated.' });
    }

    const updates: any = {};
    if (typeof req.body.name === 'string' && req.body.name.trim()) {
      updates.name = req.body.name.trim();
    }
    if (typeof req.body.organization === 'string') {
      updates.organization = req.body.organization.trim();
    }
    if (Array.isArray(req.body.interests)) {
      updates.interests = req.body.interests
        .map((i: any) => String(i).trim())
        .filter(Boolean)
        .slice(0, 30);
    }
    if (Array.isArray(req.body.domains)) {
      updates.domains = req.body.domains
        .map((d: any) => String(d).trim())
        .filter(Boolean)
        .slice(0, 20);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No valid profile fields to update.' });
    }

    const user = await dbStore.users.update(authReq.user.id, updates);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      organization: user.organization,
      interests: user.interests || [],
      domains: user.domains || [],
      savedPatents: user.savedPatents || [],
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to update profile.', error: error.message });
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
