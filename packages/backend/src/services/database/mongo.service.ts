import { MongoUser, SafeUserProfile, UserPreferences, LearningConsent } from '@bantai/shared';
import fs from 'fs';
import path from 'path';

/**
 * MongoDB Service — User Account & Profile Information ONLY.
 * 
 * STRICT ARCHITECTURAL RULE:
 * MongoDB is exclusively responsible for user account and profile information.
 * It is FORBIDDEN to store conversation messages, AI responses, or chat transcripts in MongoDB.
 */
export class MongoUserService {
  private users: Map<string, MongoUser> = new Map();
  private emailIndex: Map<string, string> = new Map();
  private storageFile: string;

  constructor(storageDir: string = './data') {
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    this.storageFile = path.join(storageDir, 'mongo_users_store.json');
    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(this.storageFile)) {
        const raw = fs.readFileSync(this.storageFile, 'utf8');
        const list: MongoUser[] = JSON.parse(raw);
        for (const user of list) {
          this.users.set(user.userId, user);
          this.emailIndex.set(user.email.toLowerCase(), user.userId);
        }
      }
    } catch (err) {
      console.warn('[MongoService] Notice: Initialized clean user store', err);
    }
  }

  private persistToDisk() {
    try {
      const list = Array.from(this.users.values());
      fs.writeFileSync(this.storageFile, JSON.stringify(list, null, 2), 'utf8');
    } catch (err) {
      console.error('[MongoService] Failed to persist user record:', err);
    }
  }

  /**
   * Defensive assertion: throws an error if any conversation-related data is passed.
   */
  private assertNoConversationData(data: Record<string, unknown>) {
    const forbiddenKeys = ['messages', 'conversation', 'transcript', 'chatHistory', 'aiResponse'];
    for (const key of forbiddenKeys) {
      if (key in data) {
        throw new Error(`[CRITICAL SECURITY VIOLATION] Attempted to store conversation data '${key}' in MongoDB! Data separation policy violated.`);
      }
    }
  }

  async createUser(user: MongoUser): Promise<SafeUserProfile> {
    this.assertNoConversationData(user as unknown as Record<string, unknown>);
    
    const emailKey = user.email.toLowerCase();
    if (this.emailIndex.has(emailKey)) {
      throw new Error(`User with email '${user.email}' already exists.`);
    }

    this.users.set(user.userId, user);
    this.emailIndex.set(emailKey, user.userId);
    this.persistToDisk();

    return this.toSafeProfile(user);
  }

  async findById(userId: string): Promise<MongoUser | null> {
    return this.users.get(userId) || null;
  }

  async findByEmail(email: string): Promise<MongoUser | null> {
    const userId = this.emailIndex.get(email.toLowerCase());
    if (!userId) return null;
    return this.users.get(userId) || null;
  }

  async findSafeProfileById(userId: string): Promise<SafeUserProfile | null> {
    const user = await this.findById(userId);
    if (!user) return null;
    return this.toSafeProfile(user);
  }

  async updatePreferences(userId: string, prefs: Partial<UserPreferences>): Promise<SafeUserProfile> {
    const user = await this.findById(userId);
    if (!user) throw new Error('User not found');

    user.preferences = { ...user.preferences, ...prefs };
    user.updatedAt = new Date().toISOString();
    this.users.set(userId, user);
    this.persistToDisk();

    return this.toSafeProfile(user);
  }

  async updateLearningConsent(userId: string, consent: Partial<LearningConsent>): Promise<SafeUserProfile> {
    const user = await this.findById(userId);
    if (!user) throw new Error('User not found');

    const now = new Date().toISOString();
    user.learningConsent = {
      ...user.learningConsent,
      ...consent,
      consentTimestamp: consent.crossUserTrainingOptIn ? now : user.learningConsent.consentTimestamp,
      withdrawnAt: consent.crossUserTrainingOptIn === false ? now : user.learningConsent.withdrawnAt
    };
    user.updatedAt = now;
    this.users.set(userId, user);
    this.persistToDisk();

    return this.toSafeProfile(user);
  }

  async updateLastLogin(userId: string): Promise<void> {
    const user = await this.findById(userId);
    if (!user) return;
    user.lastLoginAt = new Date().toISOString();
    this.persistToDisk();
  }

  async deleteUserAccount(userId: string): Promise<boolean> {
    const user = await this.findById(userId);
    if (!user) return false;

    this.emailIndex.delete(user.email.toLowerCase());
    this.users.delete(userId);
    this.persistToDisk();
    return true;
  }

  private toSafeProfile(user: MongoUser): SafeUserProfile {
    const safe = { ...user };
    delete safe.passwordHash;
    return safe;
  }
}

export const mongoUserService = new MongoUserService();
