/**
 * BANTAI QA Functional, Integration & Reliability Test Suite
 *
 * Covers end-to-end REST CRUD flows, SSE streaming, Agentic approval gates,
 * RAG ingestion/retrieval, account lifecycle, and concurrent load resilience.
 */
import request from 'supertest';
import { app } from '../backend/src/index';

async function registerUser(prefix: string) {
  const unique = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const email = `${unique}@bantai.test`;
  const password = 'StrongQaPassword!2026';
  const res = await request(app)
    .post('/api/auth/signup')
    .send({
      email,
      password,
      name: `QA ${prefix}`,
      username: unique.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 32)
    });
  expect(res.status).toBe(201);
  return {
    email,
    password,
    userId: res.body.data.user.userId as string,
    token: res.body.data.token as string
  };
}

describe('QA Functional & Integration Suite', () => {
  it('completes full Auth, Preferences & Consent lifecycle', async () => {
    const u = await registerUser('qa_auth');

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${u.token}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.learningConsent.crossUserTrainingOptIn).toBe(false);
    expect((meRes.body.data as { passwordHash?: string }).passwordHash).toBeUndefined();

    const prefRes = await request(app)
      .patch('/api/auth/preferences')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ defaultPersonalityMode: 'developer', voiceGender: 'female', theme: 'light' });
    expect(prefRes.status).toBe(200);
    expect(prefRes.body.data.preferences.defaultPersonalityMode).toBe('developer');
    expect(prefRes.body.data.preferences.voiceGender).toBe('female');

    const consentRes = await request(app)
      .patch('/api/auth/consent')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ crossUserTrainingOptIn: true, personalMemoryEnabled: false });
    expect(consentRes.status).toBe(200);
    expect(consentRes.body.data.learningConsent.crossUserTrainingOptIn).toBe(true);
    expect(consentRes.body.data.learningConsent.personalMemoryEnabled).toBe(false);

    const statusRes = await request(app)
      .get('/api/learning/status')
      .set('Authorization', `Bearer ${u.token}`);
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.crossUserTrainingOptIn).toBe(true);
  });

  it('performs full Chat Conversation CRUD + SSE stream + feedback + delete', async () => {
    const u = await registerUser('qa_chat');

    const createRes = await request(app)
      .post('/api/chat/conversations')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ title: 'Architecture Review', personalityMode: 'tapori', modelId: 'chhotu' });
    expect(createRes.status).toBe(201);
    const convId = createRes.body.data.id as string;

    const listRes = await request(app)
      .get('/api/chat/conversations')
      .set('Authorization', `Bearer ${u.token}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.some((c: { id: string }) => c.id === convId)).toBe(true);

    const streamRes = await request(app)
      .post('/api/chat/stream')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ conversationId: convId, content: 'QuickSort bata bantai', personalityMode: 'tapori', modelId: 'chhotu' });
    expect(streamRes.status).toBe(200);
    expect(streamRes.headers['content-type']).toContain('text/event-stream');
    expect(streamRes.text).toContain('data: ');

    const msgsRes = await request(app)
      .get(`/api/chat/conversations/${convId}/messages`)
      .set('Authorization', `Bearer ${u.token}`);
    expect(msgsRes.status).toBe(200);
    expect(msgsRes.body.data.length).toBe(2);
    const assistantMsgId = msgsRes.body.data[1].id as string;

    const fbRes = await request(app)
      .post('/api/chat/feedback')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ messageId: assistantMsgId, rating: 'up' });
    expect(fbRes.status).toBe(200);
    expect(fbRes.body.success).toBe(true);

    const delRes = await request(app)
      .delete(`/api/chat/conversations/${convId}`)
      .set('Authorization', `Bearer ${u.token}`);
    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);

    const msgsAfterDel = await request(app)
      .get(`/api/chat/conversations/${convId}/messages`)
      .set('Authorization', `Bearer ${u.token}`);
    expect(msgsAfterDel.status).toBe(404);
  });

  it('validates Tasks, Reminders, Calendar, Memory, RAG, and Agent Approval workflows', async () => {
    const u = await registerUser('qa_assistant');

    // Tasks CRUD
    const taskCreate = await request(app)
      .post('/api/assistant/tasks')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ title: 'Harden Production Deployment', priority: 'high' });
    expect(taskCreate.status).toBe(201);
    const taskId = taskCreate.body.data.id as string;

    const taskComplete = await request(app)
      .patch(`/api/assistant/tasks/${taskId}`)
      .set('Authorization', `Bearer ${u.token}`)
      .send({ status: 'completed' });
    expect(taskComplete.status).toBe(200);
    expect(taskComplete.body.data.completedAt).toBeDefined();

    // Reminders CRUD
    const futureIso = new Date(Date.now() + 3600_000).toISOString();
    const remCreate = await request(app)
      .post('/api/assistant/reminders')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ title: 'Run key rotation check', scheduledTime: futureIso });
    expect(remCreate.status).toBe(201);

    // Calendar validation (endTime <= startTime rejected with 400)
    const startIso = new Date(Date.now() + 7200_000).toISOString();
    const invalidCal = await request(app)
      .post('/api/assistant/calendar')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ title: 'Invalid Slot', startTime: startIso, endTime: startIso });
    expect(invalidCal.status).toBe(400);

    const validCal = await request(app)
      .post('/api/assistant/calendar')
      .set('Authorization', `Bearer ${u.token}`)
      .send({
        title: 'Security Review',
        startTime: startIso,
        endTime: new Date(Date.now() + 10_800_000).toISOString()
      });
    expect(validCal.status).toBe(201);

    // Memories CRUD across categories
    const memRes = await request(app)
      .post('/api/assistant/memory')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ key: 'stack', category: 'project', content: 'Deploying BANTAI with strict CSP & JWT revocation' });
    expect(memRes.status).toBe(201);

    // RAG Knowledge upload & query
    const uploadRes = await request(app)
      .post('/api/assistant/knowledge/upload')
      .set('Authorization', `Bearer ${u.token}`)
      .send({
        filename: 'security_notes.md',
        mimeType: 'text/markdown',
        rawText: 'Zero third-party inference. Always rotate JWT secrets before launch.'
      });
    expect(uploadRes.status).toBe(201);

    const queryRes = await request(app)
      .post('/api/assistant/knowledge/query')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ query: 'JWT secrets launch', topK: 2 });
    expect(queryRes.status).toBe(200);
    expect(queryRes.body.data.length).toBeGreaterThan(0);

    // Agentic Plan + Human Approval Gate (Email Send)
    const planRes = await request(app)
      .post('/api/assistant/agent/plan')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ goal: 'Draft and send weekly security briefing email' });
    expect(planRes.status).toBe(201);
    const planId = planRes.body.data.planId as string;

    const execPaused = await request(app)
      .post(`/api/assistant/agent/execute/${planId}`)
      .set('Authorization', `Bearer ${u.token}`);
    expect(execPaused.status).toBe(200);
    expect(execPaused.body.data.status).toBe('waiting_approval');

    const approvedExec = await request(app)
      .post('/api/assistant/agent/approve-step')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ planId, stepIndex: 1, approved: true });
    expect(approvedExec.status).toBe(200);
    expect(approvedExec.body.data.status).toBe('completed');
  });

  it('handles concurrent bursts cleanly with zero 5xx errors', async () => {
    const u = await registerUser('qa_perf');
    const started = Date.now();
    const requests = Array.from({ length: 24 }, (_, idx) => {
      if (idx % 3 === 0) {
        return request(app).get('/api/health');
      }
      if (idx % 3 === 1) {
        return request(app)
          .get('/api/assistant/tasks')
          .set('Authorization', `Bearer ${u.token}`);
      }
      return request(app)
        .get('/api/chat/conversations')
        .set('Authorization', `Bearer ${u.token}`);
    });

    const responses = await Promise.all(requests);
    const elapsedMs = Date.now() - started;

    for (const r of responses) {
      expect(r.status).toBe(200);
    }
    expect(elapsedMs).toBeLessThan(5000);
  });
});
