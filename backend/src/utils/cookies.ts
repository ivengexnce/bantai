import crypto from 'crypto';
import { Request, Response } from 'express';
import { config } from '../config/env';

export const SESSION_COOKIE_NAME = 'bantai_session';
export const CSRF_COOKIE_NAME = 'bantai_csrf';

export function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie;
  const cookies: Record<string, string> = {};
  if (!header || typeof header !== 'string') return cookies;

  for (const part of header.split(';')) {
    const eqIdx = part.indexOf('=');
    if (eqIdx <= 0) continue;
    const key = part.slice(0, eqIdx).trim();
    const rawVal = part.slice(eqIdx + 1).trim();
    try {
      cookies[key] = decodeURIComponent(rawVal);
    } catch {
      cookies[key] = rawVal;
    }
  }
  return cookies;
}

export function shouldUseSecureCookies(req?: Request): boolean {
  if (process.env.COOKIE_SECURE === 'true') return true;
  if (process.env.COOKIE_SECURE === 'false') return false;

  if (req) {
    const protoHeader = req.headers['x-forwarded-proto'];
    const forwardedHttps =
      typeof protoHeader === 'string' &&
      protoHeader.split(',')[0].trim().toLowerCase() === 'https';

    if (req.secure || forwardedHttps) return true;

    const host = (req.hostname || '').toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]') {
      return false;
    }
  }

  return config.nodeEnv === 'production';
}

export function setAuthCookies(res: Response, jwtToken: string, req?: Request): string {
  const secure = shouldUseSecureCookies(req ?? (res.req as Request | undefined));
  const csrfToken = crypto.randomBytes(32).toString('hex');
  const maxAgeMs = 7 * 24 * 60 * 60 * 1000;

  res.cookie(SESSION_COOKIE_NAME, jwtToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: maxAgeMs
  });

  // Readable by same-origin client JS solely for double-submit X-CSRF-Token header
  res.cookie(CSRF_COOKIE_NAME, csrfToken, {
    httpOnly: false,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: maxAgeMs
  });

  return csrfToken;
}

export function clearAuthCookies(res: Response, req?: Request): void {
  const secure = shouldUseSecureCookies(req ?? (res.req as Request | undefined));
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/'
  });
  res.clearCookie(CSRF_COOKIE_NAME, {
    httpOnly: false,
    sameSite: 'lax',
    secure,
    path: '/'
  });
}

export function timingSafeEqualStr(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
