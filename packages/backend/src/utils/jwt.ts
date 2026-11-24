import jwt from 'jsonwebtoken';
import { config } from '../config/env';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn']
  });
}

export function verifyToken(token: string): JwtPayload {
  // SEC-005: Explicit algorithm allowlist prevents algorithm-confusion attacks
  return jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] }) as JwtPayload;
}
