import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  tokenVersion?: number;
  jti?: string;
  iat?: number;
  exp?: number;
}

// In-memory token revocation store (jti -> exp epoch seconds) and user-wide revocation watermarks
const revokedJtis = new Map<string, number>();
const revokedUsersBefore = new Map<string, number>();

function pruneExpiredRevocations() {
  const nowSec = Math.floor(Date.now() / 1000);
  for (const [jti, exp] of revokedJtis.entries()) {
    if (exp > 0 && exp < nowSec) {
      revokedJtis.delete(jti);
    }
  }
}

export function signToken(payload: JwtPayload): string {
  const jti = payload.jti || crypto.randomUUID();
  return jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      tokenVersion: payload.tokenVersion ?? 0
    },
    config.jwtSecret,
    {
      algorithm: 'HS256',
      expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
      issuer: config.jwtIssuer,
      audience: config.jwtAudience,
      jwtid: jti
    }
  );
}

export function verifyToken(token: string): JwtPayload {
  // Enforce explicit HS256 algorithm, issuer, and audience claims
  const decoded = jwt.verify(token, config.jwtSecret, {
    algorithms: ['HS256'],
    issuer: config.jwtIssuer,
    audience: config.jwtAudience
  }) as JwtPayload;

  if (decoded.jti && isTokenRevoked(decoded.jti)) {
    throw new Error('Token has been revoked');
  }

  const revokedBefore = revokedUsersBefore.get(decoded.userId);
  if (revokedBefore !== undefined && (decoded.iat ?? 0) <= revokedBefore) {
    throw new Error('Session invalidated');
  }

  return decoded;
}

export function revokeToken(jti?: string, exp?: number): void {
  if (!jti) return;
  pruneExpiredRevocations();
  revokedJtis.set(jti, exp || Math.floor(Date.now() / 1000) + 7 * 24 * 3600);
}

export function isTokenRevoked(jti: string): boolean {
  pruneExpiredRevocations();
  return revokedJtis.has(jti);
}

export function revokeUserTokensBefore(userId: string, beforeEpochSeconds?: number): void {
  const cutoff = beforeEpochSeconds ?? Math.floor(Date.now() / 1000);
  revokedUsersBefore.set(userId, cutoff);
}
