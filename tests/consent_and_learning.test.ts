import { learningService } from '../backend/src/services/learning/learning.service';
import { mongoUserService } from '../backend/src/services/database/mongo.service';
import { personalMemoryService } from '../backend/src/services/memory/memory.service';
import { MongoUser } from '@bantai/shared';
import fs from 'fs';
import path from 'path';

describe('Consent Management, PII Scrubbing & Fine-Tuning Pipeline', () => {
  const ts = Date.now();
  const userIdOptIn = `user_opt_in_${ts}`;
  const userIdOptOut = `user_opt_out_${ts}`;
  const createdSplitDirs: string[] = [];

  afterAll(() => {
    for (const dir of createdSplitDirs) {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  beforeAll(async () => {
    // User who opted in
    const userIn: MongoUser = {
      userId: userIdOptIn,
      email: `optin_${ts}@bantai.ai`,
      name: 'OptIn User',
      username: `optinuser_${ts}`,
      role: 'user',
      status: 'active',
      preferences: {
        theme: 'dark',
        language: 'hinglish',
        defaultPersonalityMode: 'balanced',
        voiceSpeed: 1.0,
        voiceGender: 'male',
        soundEffectsEnabled: true,
        proactiveBriefingEnabled: true
      },
      learningConsent: {
        personalMemoryEnabled: true,
        crossUserTrainingOptIn: true, // EXPLICIT OPT-IN
        consentTimestamp: new Date().toISOString(),
        policyVersion: '1.0.0-2026',
        allowAnalytics: true,
        withdrawnAt: null
      },
      subscriptionPlan: 'free',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };

    // User who did NOT opt in (default)
    const userOut: MongoUser = {
      userId: userIdOptOut,
      email: `optout_${ts}@bantai.ai`,
      name: 'OptOut User',
      username: `optoutuser_${ts}`,
      role: 'user',
      status: 'active',
      preferences: {
        theme: 'light',
        language: 'english',
        defaultPersonalityMode: 'professional',
        voiceSpeed: 1.0,
        voiceGender: 'female',
        soundEffectsEnabled: false,
        proactiveBriefingEnabled: false
      },
      learningConsent: {
        personalMemoryEnabled: false, // Memory disabled
        crossUserTrainingOptIn: false, // STRICTLY DISABLED BY DEFAULT
        consentTimestamp: null,
        policyVersion: '1.0.0-2026',
        allowAnalytics: false,
        withdrawnAt: null
      },
      subscriptionPlan: 'free',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };

    await mongoUserService.createUser(userIn);
    await mongoUserService.createUser(userOut);
  });

  test('PII Scrubbing correctly removes emails, phones and API tokens', () => {
    const raw = 'My email is secret_ceo@megacorp.com, call +91 9876543210 with key sk-1234567890abcdef12345678';
    const scrubbed = learningService.scrubPII(raw);

    expect(scrubbed.hadPII).toBe(true);
    expect(scrubbed.cleanText).toContain('[REDACTED_EMAIL]');
    expect(scrubbed.cleanText).toContain('[REDACTED_PHONE]');
    expect(scrubbed.cleanText).toContain('[REDACTED_TOKEN]');
    expect(scrubbed.cleanText).not.toContain('secret_ceo@megacorp.com');
  });

  test('Disallows collecting training data if user has NOT opted in', async () => {
    const check = await learningService.canIngestForTraining(userIdOptOut);
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain('NOT given explicit opt-in consent');

    // Ingest attempt must return null
    const example = await learningService.recordTrainingExample(
      userIdOptOut,
      'Query from opt-out user',
      'Response',
      'up'
    );
    expect(example).toBeNull();
  });

  test('Allows collecting scrubbed training data for opted-in user', async () => {
    const check = await learningService.canIngestForTraining(userIdOptIn);
    expect(check.allowed).toBe(true);

    const example = await learningService.recordTrainingExample(
      userIdOptIn,
      'What is Mumbai known for? Reach me at user@test.com',
      'Mumbai is the financial capital of India, known for its commerce and vada pav!',
      'up'
    );

    expect(example).not.toBeNull();
    expect(example?.messages[0].content).toContain('[REDACTED_EMAIL]');
  });

  test('Personal memory respects personalMemoryEnabled toggle', async () => {
    const isOptInEnabled = await personalMemoryService.isMemoryEnabled(userIdOptIn);
    expect(isOptInEnabled).toBe(true);

    const isOptOutEnabled = await personalMemoryService.isMemoryEnabled(userIdOptOut);
    expect(isOptOutEnabled).toBe(false);

    // Extraction should return empty for disabled memory
    const extracted = await personalMemoryService.extractAndStoreMemories(
      userIdOptOut,
      'I prefer TypeScript over Python',
      'conv_mem_test'
    );
    expect(extracted.length).toBe(0);
  });

  test('Exporting dataset generates train/val/test splits and manifest', async () => {
    const manifest = await learningService.exportDatasetSplits(`test_split_${Date.now()}`);
    createdSplitDirs.push(path.dirname(manifest.trainFile));
    expect(manifest.totalExamples).toBeGreaterThan(0);
    expect(manifest.trainCount).toBeGreaterThanOrEqual(0);
    expect(manifest.valCount).toBeGreaterThanOrEqual(0);
    expect(manifest.testCount).toBeGreaterThanOrEqual(0);
    expect(manifest.trainFile).toBeDefined();

    // Purging withdrawn user examples removes them from buffer
    const purgedCount = learningService.purgeUserExamples(userIdOptIn);
    expect(purgedCount).toBeGreaterThanOrEqual(1);
  });
});
