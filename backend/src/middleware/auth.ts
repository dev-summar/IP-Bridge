import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { dbStore } from '../services/dbStore';

export const JWT_SECRET = process.env.JWT_SECRET || 'patentbridge-super-secret-key-12345';

export interface IAuthRequest extends Request {
  user?: {
    id: string;
    role: 'admin' | 'owner' | 'buyer';
    email: string;
    name: string;
  };
}

export async function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authReq = req as IAuthRequest;
  
  // Extract token from header or cookie
  let token = '';
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.headers.cookie) {
    // Basic parser for cookies
    const cookieToken = req.headers.cookie
      .split(';')
      .map(c => c.trim())
      .find(c => c.startsWith('token='));
    if (cookieToken) {
      token = cookieToken.split('=')[1];
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No authentication token provided.' });
  }

  let verified: any;
  try {
    verified = jwt.verify(token, JWT_SECRET);
    if (typeof verified.id !== 'string' || !verified.id) {
      return res.status(403).json({ message: 'Invalid or expired session token.' });
    }
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired session token.' });
  }
  try {
    const user = await dbStore.users.findById(verified.id);
    if (!user) {
      return res.status(401).json({ message: 'This account no longer exists. Please sign in again.' });
    }
    authReq.user = {
      id: String(user._id),
      role: user.role,
      email: user.email,
      name: user.name
    };
  } catch (error) {
    return res.status(503).json({ message: 'Unable to verify your account. Please try again.' });
  }
  next();
}

export function authorizeRoles(...roles: ('admin' | 'owner' | 'buyer')[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as IAuthRequest;
    if (!authReq.user) {
      return res.status(401).json({ message: 'Unauthorized. User session not verified.' });
    }

    if (!roles.includes(authReq.user.role)) {
      return res.status(403).json({ 
        message: `Forbidden. Access requires one of the following roles: [${roles.join(', ')}]. Current role: [${authReq.user.role}]` 
      });
    }

    next();
  };
}
