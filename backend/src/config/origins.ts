import { config } from './env';

export function normalizeOrigin(raw: string): string | null {
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

export const ALLOWED_ORIGINS = new Set<string>(
  [
    ...(config.clientUrls || []),
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://10.0.2.2:3000'
  ]
    .map(normalizeOrigin)
    .filter((o): o is string => Boolean(o))
);

export function isAllowedOrigin(origin: string): boolean {
  const normalized = normalizeOrigin(origin);
  return Boolean(normalized && ALLOWED_ORIGINS.has(normalized));
}
