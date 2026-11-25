import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt';
import { mongoUserService } from '../services/database/mongo.service';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Missing or malformed authorization header.'
      });
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Missing session token.'
      });
    }

    const decoded = verifyToken(token);
    const existingUser = await mongoUserService.findById(decoded.userId);
    if (existingUser) {
      if (existingUser.status !== 'active') {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: User account is not active.'
        });
      }
      if ((decoded.tokenVersion ?? 0) !== (existingUser.tokenVersion ?? 0)) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized: Session invalidated due to security event.'
        });
      }
    }

    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid or expired session token.'
    });
  }
}

export function requireRole(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Insufficient permissions for this operation.'
      });
    }
    next();
  };
}
