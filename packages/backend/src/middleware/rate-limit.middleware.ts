import rateLimit from 'express-rate-limit';

/**
 * Auth endpoints: 10 requests per 15 minutes per IP.
 * Protects against brute-force attacks on login/signup/google-auth.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' }
});

/**
 * Voice TTS: 30 requests per minute per IP.
 * Protects against ElevenLabs API key abuse.
 */
export const voiceRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Voice rate limit exceeded, please slow down.' }
});

/**
 * General API: 200 requests per minute per IP.
 * Applied globally to all /api routes.
 */
export const generalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Rate limit exceeded.' }
});
