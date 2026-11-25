import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt';
import { mongoUserService } from '../services/database/mongo.service';
import {
  CSRF_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  parseCookies,
  timingSafeEqualStr
} from '../utils/cookies';
import { isAllowedOrigin } from '../config/origins';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
  authSource?: 'bearer' | 'cookie';
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function validateCsrfForCookieRequest(req: Request): string | null {
  if (SAFE_METHODS.has(req.method)) return null;

  const originHeader = req.headers.origin;
  if (originHeader && !isAllowedOrigin(originHeader)) {
    return 'Forbidden: Untrusted origin for cookie-authenticated mutation.';
  }

  if (!originHeader && req.headers.referer) {
    try {
      const refOrigin = new URL(req.headers.referer).origin;
      if (!isAllowedOrigin(refOrigin)) {
        return 'Forbidden: Untrusted referer for cookie-authenticated mutation.';
      }
    } catch {
      return 'Forbidden: Malformed referer header.';
    }
  }

  const cookies = parseCookies(req);
  const csrfCookie = cookies[CSRF_COOKIE_NAME] || '';
  const csrfHeaderRaw = req.headers['x-csrf-token'];
  const csrfHeader = typeof csrfHeaderRaw === 'string' ? csrfHeaderRaw : '';

  if (!csrfCookie || !csrfHeader || !timingSafeEqualStr(csrfCookie, csrfHeader)) {
    return 'Forbidden: Invalid or missing CSRF token.';
  }

  return null;
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    let token = '';
    let authSource: 'bearer' | 'cookie' = 'bearer';

    if (authHeader) {
      if (!authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized: Missing or malformed authorization header.'
        });
      }
      token = authHeader.slice(7).trim();
    } else {
      const cookies = parseCookies(req);
      if (cookies[SESSION_COOKIE_NAME]) {
        token = cookies[SESSION_COOKIE_NAME];
        authSource = 'cookie';
      }
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Missing or malformed authorization header.'
      });
    }

    if (authSource === 'cookie') {
      const csrfError = validateCsrfForCookieRequest(req);
      if (csrfError) {
        return res.status(403).json({ success: false, error: csrfError });
      }
    }

    const decoded = verifyToken(token, 'session');
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
    req.authSource = authSource;
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
