import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { stateStore } from '../services/state/state_store.service';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  tokenVersion?: number;
  purpose?: 'session' | 'mfa_challenge';
  jti?: string;
  iat?: number;
  exp?: number;
}

const REVOKED_JTI_PREFIX = 'revoked_jti:';
const REVOKED_USER_BEFORE_PREFIX = 'revoked_user_before:';

export function signToken(payload: JwtPayload): string {
  const jti = payload.jti || crypto.randomUUID();
  return jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      tokenVersion: payload.tokenVersion ?? 0,
      purpose: 'session'
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

export function signMfaChallengeToken(payload: { userId: string; email: string; role: string; tokenVersion?: number }): string {
  return jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      tokenVersion: payload.tokenVersion ?? 0,
      purpose: 'mfa_challenge'
    },
    config.jwtSecret,
    {
      algorithm: 'HS256',
      expiresIn: '5m',
      issuer: config.jwtIssuer,
      audience: config.jwtAudience,
      jwtid: crypto.randomUUID()
    }
  );
}

export function verifyToken(token: string, expectedPurpose: 'session' | 'mfa_challenge' = 'session'): JwtPayload {
  const decoded = jwt.verify(token, config.jwtSecret, {
    algorithms: ['HS256'],
    issuer: config.jwtIssuer,
    audience: config.jwtAudience
  }) as JwtPayload;

  const actualPurpose = decoded.purpose || 'session';
  if (actualPurpose !== expectedPurpose) {
    throw new Error('Invalid token purpose');
  }

  if (decoded.jti && isTokenRevoked(decoded.jti)) {
    throw new Error('Token has been revoked');
  }

  const revokedBefore = stateStore.getSync<number>(`${REVOKED_USER_BEFORE_PREFIX}${decoded.userId}`);
  if (typeof revokedBefore === 'number' && (decoded.iat ?? 0) <= revokedBefore) {
    throw new Error('Session invalidated');
  }

  return decoded;
}

export function revokeToken(jti?: string, exp?: number): void {
  if (!jti) return;
  const nowSec = Math.floor(Date.now() / 1000);
  const expSec = exp && exp > nowSec ? exp : nowSec + 7 * 24 * 3600;
  const ttlMs = Math.max(60_000, (expSec - nowSec) * 1000);
  stateStore.setSync(`${REVOKED_JTI_PREFIX}${jti}`, expSec, ttlMs);
}

export function isTokenRevoked(jti: string): boolean {
  const storedExp = stateStore.getSync<number>(`${REVOKED_JTI_PREFIX}${jti}`);
  if (typeof storedExp !== 'number') return false;
  return storedExp <= 0 || storedExp >= Math.floor(Date.now() / 1000);
}

export function revokeUserTokensBefore(userId: string, beforeEpochSeconds?: number): void {
  const cutoff = beforeEpochSeconds ?? Math.floor(Date.now() / 1000);
  stateStore.setSync(`${REVOKED_USER_BEFORE_PREFIX}${userId}`, cutoff, 30 * 24 * 3600 * 1000);
}
