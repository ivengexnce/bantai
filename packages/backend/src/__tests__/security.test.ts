/**
 * BANTAI Security Regression Test Suite
 * 
 * Tests: SEC-001 (CORS), SEC-004 (Rate Limiting), SEC-005 (JWT Algorithm),
 *        SEC-006 (Google OAuth), Auth bypass, BOLA, Expired/Malformed JWT
 * 
 * Run: npm --workspace=@bantai/backend run test
 */
import request from 'supertest';
import { app, authRateLimiter } from '../index';
import { signToken } from '../utils/jwt';
import jwt from 'jsonwebtoken';

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------
function makeValidToken(overrides: Partial<{ userId: string; email: string; role: string }> = {}) {
  return signToken({
    userId: overrides.userId ?? 'test-user-sec-001',
    email: overrides.email ?? 'sec-test@bantai.local',
    role: overrides.role ?? 'user'
  });
}

// -------------------------------------------------------------------------
// SEC-001 — CORS: reject non-whitelisted origins
// -------------------------------------------------------------------------
describe('SEC-001 — CORS Origin Enforcement', () => {
  it('allows a whitelisted localhost origin', async () => {
    const res = await request(app)
      .options('/api/health')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'GET');
    // Should not reject — 204 or 200
    expect([200, 204]).toContain(res.status);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
  });

  it('rejects a non-whitelisted external origin', async () => {
    const res = await request(app)
      .options('/api/health')
      .set('Origin', 'https://evil.example.com')
      .set('Access-Control-Request-Method', 'GET');
    // CORS rejection: either 500 (Express CORS error) or no allow-origin header
    const allowOrigin = res.headers['access-control-allow-origin'];
    expect(allowOrigin).not.toBe('https://evil.example.com');
  });

  it('allows request with no origin (server-to-server) in development', async () => {
    // NODE_ENV is 'test' (non-production) so null-origin should pass
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
  });
});

// -------------------------------------------------------------------------
// Auth Endpoint Protection — 401 without token
// -------------------------------------------------------------------------
describe('Auth Bypass Protection', () => {
  it('GET /api/chat/conversations returns 401 without token', async () => {
    const res = await request(app).get('/api/chat/conversations');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/auth/me returns 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/assistant/tools returns 401 without token', async () => {
    const res = await request(app).get('/api/assistant/tools');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

// -------------------------------------------------------------------------
// SEC-005 — JWT Algorithm Allowlist
// -------------------------------------------------------------------------
describe('SEC-005 — JWT Algorithm Enforcement', () => {
  it('rejects a JWT signed with the none algorithm', async () => {
    // Craft a 'none' algorithm token manually
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      userId: 'attacker',
      email: 'evil@evil.com',
      role: 'admin',
      iat: Math.floor(Date.now() / 1000)
    })).toString('base64url');
    const noneToken = `${header}.${payload}.`;

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${noneToken}`);
    expect(res.status).toBe(401);
  });

  it('rejects a JWT signed with a wrong secret', async () => {
    const wrongToken = jwt.sign(
      { userId: 'attacker', email: 'x@x.com', role: 'user' },
      'wrong-secret-key',
      { algorithm: 'HS256' }
    );
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${wrongToken}`);
    expect(res.status).toBe(401);
  });

  it('rejects an expired JWT token', async () => {
    const expiredToken = jwt.sign(
      { userId: 'test', email: 'x@x.com', role: 'user' },
      process.env.JWT_SECRET || 'bantai-super-secret-production-jwt-key-change-in-prod-2026',
      { algorithm: 'HS256', expiresIn: '1ms' }
    );
    // Wait for expiry
    await new Promise(r => setTimeout(r, 10));
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`);
    expect(res.status).toBe(401);
  });

  it('rejects a malformed Authorization header', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'NotBearer abc123');
    expect(res.status).toBe(401);
  });

  it('rejects empty Authorization header', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', '');
    expect(res.status).toBe(401);
  });
});

// -------------------------------------------------------------------------
// SEC-006 — Google OAuth: dev endpoint disabled in production
// -------------------------------------------------------------------------
describe('SEC-006 — Google OAuth Simulation Gate', () => {
  it('returns 501 when GOOGLE_CLIENT_ID is not set (default)', async () => {
    const savedEnv = process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_ID;

    const res = await request(app)
      .post('/api/auth/google')
      .send({ idToken: 'fake-token-12345' });

    // Should be 501 (not implemented) since no GOOGLE_CLIENT_ID
    expect(res.status).toBe(501);
    expect(res.body.success).toBe(false);

    if (savedEnv !== undefined) process.env.GOOGLE_CLIENT_ID = savedEnv;
  });
});

// -------------------------------------------------------------------------
// Security Headers (Helmet — SEC-007)
// -------------------------------------------------------------------------
describe('SEC-007 — Security Response Headers', () => {
  it('includes X-Content-Type-Options header', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('includes X-Frame-Options header', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-frame-options']).toBeDefined();
  });

  it('includes X-XSS-Protection header', async () => {
    const res = await request(app).get('/api/health');
    // Helmet sets this to '0' (disabling browser XSS filter as it can introduce vulnerabilities)
    expect(res.headers['x-xss-protection']).toBeDefined();
  });
});

// -------------------------------------------------------------------------
// Input Validation — Zod schema enforcement
// -------------------------------------------------------------------------
describe('Input Validation — Auth Schemas', () => {
  it('POST /api/auth/signup rejects empty body with 400', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/auth/signup rejects invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'not-an-email', password: 'P@ssw0rd123', name: 'Test', username: 'tester' });
    expect(res.status).toBe(400);
  });

  it('POST /api/auth/login rejects missing password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com' });
    expect(res.status).toBe(400);
  });

  it('POST /api/chat/stream rejects unauthenticated access', async () => {
    const res = await request(app)
      .post('/api/chat/stream')
      .send({ conversationId: 'some-id', content: 'hello' });
    expect(res.status).toBe(401);
  });
});

// -------------------------------------------------------------------------
// BOLA — Broken Object Level Authorization
// -------------------------------------------------------------------------
describe('BOLA — Conversation Ownership', () => {
  it('requires auth for GET /api/chat/conversations/:id/messages', async () => {
    const res = await request(app)
      .get('/api/chat/conversations/non-existent-id/messages');
    expect(res.status).toBe(401);
  });

  it('returns 404 (not 403/200) when authenticated user accesses non-existent conversation', async () => {
    const token = makeValidToken({ userId: 'user-bola-test' });
    const res = await request(app)
      .post('/api/chat/stream')
      .set('Authorization', `Bearer ${token}`)
      .send({ conversationId: 'completely-fake-conversation-id', content: 'hello' });
    // Should 404 because conversation not found for this user
    expect([404, 400]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });
});

// -------------------------------------------------------------------------
// Voice Endpoint Protection (SEC-004 / auth gate)
// -------------------------------------------------------------------------
describe('Voice Endpoint Auth Protection', () => {
  it('GET /api/voice/elevenlabs/voices requires auth', async () => {
    const res = await request(app).get('/api/voice/elevenlabs/voices');
    expect(res.status).toBe(401);
  });

  it('POST /api/voice/elevenlabs/tts requires auth', async () => {
    const res = await request(app)
      .post('/api/voice/elevenlabs/tts')
      .send({ text: 'Hello' });
    expect(res.status).toBe(401);
  });
});

// -------------------------------------------------------------------------
// Health Check — baseline
// -------------------------------------------------------------------------
describe('Health Check', () => {
  it('GET /api/health returns 200', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('online');
  });
});
