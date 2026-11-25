import request from 'supertest';
import { app } from '../backend/src/index';

describe('Authentication & Protected Route Endpoints', () => {
  const uniqueEmail = `test_auth_${Date.now()}@bantai.ai`;
  const password = 'BantaiSecurePassword2026!';
  let authToken = '';

  test('POST /api/auth/signup - creates user and returns JWT token', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        email: uniqueEmail,
        password,
        name: 'Munna Bhai',
        username: `munna_${Date.now().toString().slice(-4)}`
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe(uniqueEmail);
    authToken = res.body.data.token;
  });

  test('POST /api/auth/login - authenticates valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: uniqueEmail,
        password
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
  });

  test('POST /api/auth/login - rejects invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: uniqueEmail,
        password: 'WrongPassword123'
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/auth/me - requires valid JWT token', async () => {
    // Without token
    const unauthRes = await request(app).get('/api/auth/me');
    expect(unauthRes.status).toBe(401);

    // With valid token
    const authRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`);

    expect(authRes.status).toBe(200);
    expect(authRes.body.data.email).toBe(uniqueEmail);
  });
});
