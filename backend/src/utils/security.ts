import { Response } from 'express';
import { config } from '../config/env';

const REDACT_PATTERNS: Array<[RegExp, string]> = [
  [/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED]'],
  [/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}/g, '[REDACTED_JWT]'],
  [/\b(?:sk-[a-zA-Z0-9_-]{16,}|ghp_[a-zA-Z0-9_-]{20,}|AIza[0-9A-Za-z_-]{35}|AKIA[0-9A-Z]{16})\b/g, '[REDACTED_KEY]'],
  [/((?:mongodb(?:\+srv)?|postgres(?:ql)?|redis):\/\/[^:\s/@]+:)([^@\s/]+)(@)/gi, '$1[REDACTED]$3']
];

/**
 * Redacts sensitive tokens, credentials, and control characters from log strings
 * to prevent credential disclosure and log injection.
 */
export function sanitizeForLog(input: unknown): string {
  let text = input instanceof Error ? input.message : String(input ?? '');
  text = text.replace(/[\r\n\x00-\x1f\x7f]/g, ' ');
  for (const [pattern, replacement] of REDACT_PATTERNS) {
    text = text.replace(pattern, replacement);
  }
  return text.slice(0, 500);
}

/**
 * Sends a standardized 500 error without leaking internal error details in production.
 */
export function sendInternalError(res: Response, context: string, err: unknown) {
  console.error(`[${context}]`, sanitizeForLog(err));
  const message =
    config.nodeEnv === 'production'
      ? 'Internal Server Error'
      : sanitizeForLog(err) || 'Internal Server Error';
  return res.status(500).json({ success: false, error: message });
}

/**
 * Returns 404 when a user-scoped resource is missing or not owned by the caller,
 * or 500 on unexpected storage errors.
 */
export function sendResourceError(res: Response, context: string, err: unknown) {
  const msg = err instanceof Error ? err.message : '';
  if (/not found|unauthorized/i.test(msg)) {
    return res.status(404).json({ success: false, error: 'Resource not found' });
  }
  return sendInternalError(res, context, err);
}
