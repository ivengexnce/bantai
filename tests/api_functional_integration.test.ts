/**
 * BANTAI QA Functional, Integration & Reliability Test Suite
 *
 * Covers end-to-end REST CRUD flows, SSE streaming, Agentic approval gates,
 * RAG ingestion/retrieval, account lifecycle, and concurrent load resilience.
 */
import fs from 'fs';
import path from 'path';
import request from 'supertest';
import { app } from '../backend/src/index';
import { StateStoreService } from '../backend/src/services/state/state_store.service';
import { config } from '../backend/src/config/env';

function buildMinimalPdfBase64(text: string): string {
  const escaped = text.replace(/([()\\])/g, '\\$1');
  const stream = `BT\n/F1 12 Tf\n72 720 Td\n(${escaped}) Tj\nET`;
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `5 0 obj\n<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream\nendobj\n`
  ];
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += obj;
  }
  const xrefStart = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(pdf, 'utf8').toString('base64');
}

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
      .send({ title: 'Architecture Review', personalityMode: 'balanced', modelId: 'chhotu' });
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
      .send({ conversationId: convId, content: 'Explain QuickSort concisely', personalityMode: 'balanced', modelId: 'chhotu' });
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
    const emailStepResult = approvedExec.body.data.steps[1].result;
    expect(emailStepResult.emlContent).toContain('MIME-Version: 1.0');
    expect(emailStepResult.transport).toBe('local_outbox');

    // Persisted plans survive stateStore restart & calendar generates real RFC 5545 .ics
    const calPlan = await request(app)
      .post('/api/assistant/agent/plan')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ goal: 'Schedule architecture calendar meeting tomorrow' });
    expect(calPlan.status).toBe(201);
    const calExec = await request(app)
      .post(`/api/assistant/agent/execute/${calPlan.body.data.planId}`)
      .set('Authorization', `Bearer ${u.token}`);
    expect(calExec.status).toBe(200);
    expect(calExec.body.data.steps[0].result.icsContent).toContain('BEGIN:VCALENDAR');

    const reloadedStore = new StateStoreService(process.env.DATA_DIR || config.dataDir, '');
    const reloadedPlan = await reloadedStore.get<{ planId: string }>(`agent_plan:${calPlan.body.data.planId}`);
    expect(reloadedPlan?.planId).toBe(calPlan.body.data.planId);

    const plansList = await request(app)
      .get('/api/assistant/agent/plans')
      .set('Authorization', `Bearer ${u.token}`);
    expect(plansList.status).toBe(200);
    expect(plansList.body.data.length).toBeGreaterThanOrEqual(2);
  });

  it('supports bounded PDF ingestion, Hybrid BM25 + Cosine RAG ranking, and complete GDPR wipe', async () => {
    const u = await registerUser('qa_pdf_rag');

    // Reject forged non-PDF header cleanly
    const badPdf = await request(app)
      .post('/api/assistant/knowledge/upload')
      .set('Authorization', `Bearer ${u.token}`)
      .send({
        filename: 'fake.pdf',
        mimeType: 'application/pdf',
        rawPdfBase64: Buffer.from('NOT_A_PDF_FILE').toString('base64')
      });
    expect(badPdf.status).toBe(400);

    // Upload genuine minimal PDF & distractor text doc
    const validPdfRes = await request(app)
      .post('/api/assistant/knowledge/upload')
      .set('Authorization', `Bearer ${u.token}`)
      .send({
        filename: 'hardware_spec.pdf',
        mimeType: 'application/pdf',
        rawPdfBase64: buildMinimalPdfBase64('BANTAI RTX-A2000-NVENC-9942 QLoRA Spec')
      });
    if (validPdfRes.status !== 201) {
      throw new Error(`Expected 201 from PDF upload, got ${validPdfRes.status}: ${JSON.stringify(validPdfRes.body)}`);
    }
    expect(validPdfRes.status).toBe(201);
    expect(validPdfRes.body.data.chunkCount).toBeGreaterThan(0);

    await request(app)
      .post('/api/assistant/knowledge/upload')
      .set('Authorization', `Bearer ${u.token}`)
      .send({
        filename: 'distractor.md',
        mimeType: 'text/markdown',
        rawText: 'Monthly team sync notes covering frontend styling and deployment checklists.'
      });

    // Hybrid BM25 + Cosine prioritizes exact technical identifier
    const queryRes = await request(app)
      .post('/api/assistant/knowledge/query')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ query: 'RTX-A2000-NVENC-9942', topK: 2 });
    expect(queryRes.status).toBe(200);
    expect(queryRes.body.data.length).toBeGreaterThan(0);
    expect(queryRes.body.data[0].text).toContain('RTX-A2000-NVENC-9942');

    // Wipe cleans user records, vectors, plans, and invalidates JWT
    const wipeRes = await request(app)
      .post('/api/learning/wipe-data')
      .set('Authorization', `Bearer ${u.token}`)
      .send({});
    expect(wipeRes.status).toBe(200);

    const postWipeMe = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${u.token}`);
    expect(postWipeMe.status).toBe(401);

    const vecPath = path.join(process.env.DATA_DIR || config.dataDir, 'rag_vectors.json');
    if (fs.existsSync(vecPath)) {
      const vecs = JSON.parse(fs.readFileSync(vecPath, 'utf8')) as Array<{ userId: string }>;
      expect(vecs.some(v => v.userId === u.userId)).toBe(false);
    }
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
