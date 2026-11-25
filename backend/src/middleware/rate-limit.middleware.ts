import rateLimit from 'express-rate-limit';

/**
 * Auth login/oauth/password brute-force guard: 10 failed attempts per 15 minutes per IP.
 * skipSuccessfulRequests prevents locking out legitimate users behind shared NAT IPs.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' }
});

/**
 * Account creation rate limiter: 20 signups per 15 minutes per IP.
 */
export const signupRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many account creation attempts, please try again later.' }
});

/**
 * Chat & streaming LLM inference: 30 requests per minute per IP.
 */
export const chatRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Chat rate limit exceeded, please slow down.' }
});

/**
 * Assistant mutations (knowledge ingestion, agent plan execution): 60 requests per minute per IP.
 */
export const assistantRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Assistant rate limit exceeded, please slow down.' }
});

/**
 * Voice TTS: 30 requests per minute per IP.
 * Protects against ElevenLabs API quota abuse.
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
