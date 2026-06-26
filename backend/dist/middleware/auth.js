"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWT_SECRET = void 0;
exports.authenticateToken = authenticateToken;
exports.authorizeRoles = authorizeRoles;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
exports.JWT_SECRET = process.env.JWT_SECRET || 'patentbridge-super-secret-key-12345';
function authenticateToken(req, res, next) {
    const authReq = req;
    // Extract token from header or cookie
    let token = '';
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
    }
    else if (req.headers.cookie) {
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
    try {
        const verified = jsonwebtoken_1.default.verify(token, exports.JWT_SECRET);
        authReq.user = {
            id: verified.id,
            role: verified.role,
            email: verified.email,
            name: verified.name
        };
        next();
    }
    catch (error) {
        return res.status(403).json({ message: 'Invalid or expired session token.' });
    }
}
function authorizeRoles(...roles) {
    return (req, res, next) => {
        const authReq = req;
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
