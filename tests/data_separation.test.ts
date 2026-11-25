import { MongoUserService } from '../backend/src/services/database/mongo.service';
import { FirebaseFirestoreService } from '../backend/src/services/database/firebase.service';
import { MongoUser, FirestoreConversation } from '@bantai/shared';
import fs from 'fs';
import path from 'path';

describe('Strict Database Architecture & Data Separation', () => {
  const testDir = path.join(__dirname, 'test_data_sep');
  let mongoService: MongoUserService;
  let firebaseService: FirebaseFirestoreService;

  beforeAll(() => {
    if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true });
    mongoService = new MongoUserService(testDir);
    firebaseService = new FirebaseFirestoreService(testDir);
  });

  afterAll(() => {
    if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true });
  });

  test('MongoDB stores user profile information correctly', async () => {
    const user: MongoUser = {
      userId: 'user_sep_1',
      email: 'test_sep@bantai.ai',
      name: 'Bantai Bhai',
      username: 'bantaibhai',
      passwordHash: 'hash123',
      role: 'user',
      status: 'active',
      preferences: {
        theme: 'dark',
        language: 'hinglish',
        defaultPersonalityMode: 'tapori',
        voiceSpeed: 1.0,
        voiceGender: 'male',
        soundEffectsEnabled: true,
        proactiveBriefingEnabled: true
      },
      learningConsent: {
        personalMemoryEnabled: true,
        crossUserTrainingOptIn: false,
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

    const saved = await mongoService.createUser(user);
    expect(saved.userId).toBe('user_sep_1');
    expect(saved.email).toBe('test_sep@bantai.ai');
    // Password hash must never leak in safe profile
    expect((saved as unknown as { passwordHash?: string }).passwordHash).toBeUndefined();
  });

  test('MongoDB defensive check throws error if conversation messages are passed', async () => {
    const invalidData = {
      userId: 'user_sep_2',
      email: 'leak@bantai.ai',
      name: 'Leak Test',
      username: 'leaktest',
      messages: ['Hey bantai', 'Bol bhidu'] // FORBIDDEN IN MONGO
    };

    await expect(mongoService.createUser(invalidData as unknown as MongoUser)).rejects.toThrow(
      /CRITICAL SECURITY VIOLATION/
    );
  });

  test('Firebase stores conversations and isolates by userId', async () => {
    const conv1: FirestoreConversation = {
      id: 'conv_1',
      userId: 'user_sep_1',
      title: 'First Chat',
      personalityMode: 'tapori',
      modelId: 'qwen2.5:7b',
      messageCount: 0,
      isArchived: false,
      isPinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString()
    };

    const conv2: FirestoreConversation = {
      id: 'conv_2',
      userId: 'different_user',
      title: 'Private Chat',
      personalityMode: 'professional',
      modelId: 'qwen2.5:7b',
      messageCount: 0,
      isArchived: false,
      isPinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString()
    };

    await firebaseService.createConversation(conv1);
    await firebaseService.createConversation(conv2);

    const user1Chats = await firebaseService.getConversations('user_sep_1');
    expect(user1Chats.length).toBe(1);
    expect(user1Chats[0].id).toBe('conv_1');

    // user_sep_1 must NEVER be able to retrieve different_user's conversation
    const unauthorizedAccess = await firebaseService.getConversationById('user_sep_1', 'conv_2');
    expect(unauthorizedAccess).toBeNull();
  });
});
