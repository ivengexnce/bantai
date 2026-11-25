import { Request, Response, NextFunction } from 'express';

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function containsUnsafeKey(value: unknown, depth: number = 0): string | null {
  if (depth > 20 || value === null || typeof value !== 'object') {
    return null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const hit = containsUnsafeKey(item, depth + 1);
      if (hit) return hit;
    }
    return null;
  }

  // Check own keys (including non-enumerable __proto__ assigned via JSON.parse)
  for (const key of Object.getOwnPropertyNames(value)) {
    if (FORBIDDEN_KEYS.has(key) || key.startsWith('$')) {
      return key;
    }
    const propVal = (value as Record<string, unknown>)[key];
    const hit = containsUnsafeKey(propVal, depth + 1);
    if (hit) return hit;
  }
  return null;
}

/**
 * Blocks MongoDB operator injection ($gt, $where, etc.) and prototype pollution keys
 * recursively across JSON body, query strings, and URL parameters.
 */
export function rejectUnsafePayloadKeys(req: Request, res: Response, next: NextFunction) {
  const badKey =
    containsUnsafeKey(req.body) ||
    containsUnsafeKey(req.query) ||
    containsUnsafeKey(req.params);

  if (badKey) {
    return res.status(400).json({
      success: false,
      error: 'Invalid request payload: prohibited key name detected.'
    });
  }
  next();
}
