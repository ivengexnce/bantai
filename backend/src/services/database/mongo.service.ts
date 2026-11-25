import { MongoUser, SafeUserProfile, UserPreferences, LearningConsent } from '@bantai/shared';
import fs from 'fs';
import path from 'path';
import { config } from '../../config/env';
import { revokeUserTokensBefore } from '../../utils/jwt';

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
  private usernameIndex: Map<string, string> = new Map();
  private storageFile: string;

  constructor(storageDir: string = config.dataDir) {
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true, mode: 0o700 });
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
          if (user.username) {
            this.usernameIndex.set(user.username.toLowerCase(), user.userId);
          }
        }
      }
    } catch (err) {
      console.warn('[MongoService] Notice: Initialized clean user store', err);
    }
  }

  private persistToDisk() {
    try {
      const list = Array.from(this.users.values());
      const tmpFile = `${this.storageFile}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(list, null, 2), { encoding: 'utf8', mode: 0o600 });
      fs.renameSync(tmpFile, this.storageFile);
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
    const usernameKey = user.username.toLowerCase();
    if (this.emailIndex.has(emailKey)) {
      throw new Error(`User with email '${user.email}' already exists.`);
    }
    if (this.usernameIndex.has(usernameKey)) {
      throw new Error(`Username '${user.username}' is already taken.`);
    }

    const persistedUser: MongoUser = {
      ...user,
      tokenVersion: user.tokenVersion ?? 0
    };

    this.users.set(persistedUser.userId, persistedUser);
    this.emailIndex.set(emailKey, persistedUser.userId);
    this.usernameIndex.set(usernameKey, persistedUser.userId);
    this.persistToDisk();

    return this.toSafeProfile(persistedUser);
  }

  async findById(userId: string): Promise<MongoUser | null> {
    return this.users.get(userId) || null;
  }

  async findByEmail(email: string): Promise<MongoUser | null> {
    const userId = this.emailIndex.get(email.toLowerCase());
    if (!userId) return null;
    return this.users.get(userId) || null;
  }

  async findByUsername(username: string): Promise<MongoUser | null> {
    const userId = this.usernameIndex.get(username.toLowerCase());
    if (!userId) return null;
    return this.users.get(userId) || null;
  }

  async findSafeProfileById(userId: string): Promise<SafeUserProfile | null> {
    const user = await this.findById(userId);
    if (!user) return null;
    return this.toSafeProfile(user);
  }

  async updatePreferences(userId: string, prefs: Partial<UserPreferences>): Promise<SafeUserProfile> {
    this.assertNoConversationData(prefs as unknown as Record<string, unknown>);
    const user = await this.findById(userId);
    if (!user) throw new Error('User not found');

    user.preferences = { ...user.preferences, ...prefs };
    user.updatedAt = new Date().toISOString();
    this.users.set(userId, user);
    this.persistToDisk();

    return this.toSafeProfile(user);
  }

  async updateLearningConsent(userId: string, consent: Partial<LearningConsent>): Promise<SafeUserProfile> {
    this.assertNoConversationData(consent as unknown as Record<string, unknown>);
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

  async updatePasswordHash(userId: string, newPasswordHash: string): Promise<number> {
    const user = await this.findById(userId);
    if (!user) throw new Error('User not found');

    user.passwordHash = newPasswordHash;
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    user.updatedAt = new Date().toISOString();
    this.users.set(userId, user);
    this.persistToDisk();

    return user.tokenVersion;
  }

  async incrementTokenVersion(userId: string): Promise<number> {
    const user = await this.findById(userId);
    if (!user) throw new Error('User not found');

    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    user.updatedAt = new Date().toISOString();
    this.users.set(userId, user);
    this.persistToDisk();

    return user.tokenVersion;
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
    if (user.username) {
      this.usernameIndex.delete(user.username.toLowerCase());
    }
    this.users.delete(userId);
    this.persistToDisk();

    revokeUserTokensBefore(userId, Math.floor(Date.now() / 1000) + 1);
    return true;
  }

  async setPendingMfaSecret(userId: string, secret: string): Promise<void> {
    const user = await this.findById(userId);
    if (!user) throw new Error('User not found');
    user.mfaPendingSecret = secret;
    user.updatedAt = new Date().toISOString();
    this.users.set(userId, user);
    this.persistToDisk();
  }

  async enableMfa(userId: string, secret: string, recoveryCodeHashes: string[]): Promise<SafeUserProfile> {
    const user = await this.findById(userId);
    if (!user) throw new Error('User not found');
    user.mfaEnabled = true;
    user.mfaSecret = secret;
    delete user.mfaPendingSecret;
    delete user.mfaLastUsedStep;
    user.mfaRecoveryCodeHashes = recoveryCodeHashes;
    user.updatedAt = new Date().toISOString();
    this.users.set(userId, user);
    this.persistToDisk();
    return this.toSafeProfile(user);
  }

  async recordTotpStepUsed(userId: string, step: number): Promise<void> {
    const user = await this.findById(userId);
    if (!user) return;
    user.mfaLastUsedStep = step;
    this.users.set(userId, user);
    this.persistToDisk();
  }

  async consumeRecoveryCode(userId: string, codeHash: string): Promise<boolean> {
    const user = await this.findById(userId);
    if (!user || !user.mfaRecoveryCodeHashes) return false;
    const idx = user.mfaRecoveryCodeHashes.indexOf(codeHash);
    if (idx === -1) return false;
    user.mfaRecoveryCodeHashes.splice(idx, 1);
    user.updatedAt = new Date().toISOString();
    this.users.set(userId, user);
    this.persistToDisk();
    return true;
  }

  async disableMfa(userId: string): Promise<SafeUserProfile> {
    const user = await this.findById(userId);
    if (!user) throw new Error('User not found');
    user.mfaEnabled = false;
    delete user.mfaSecret;
    delete user.mfaPendingSecret;
    delete user.mfaLastUsedStep;
    delete user.mfaRecoveryCodeHashes;
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    user.updatedAt = new Date().toISOString();
    this.users.set(userId, user);
    this.persistToDisk();
    return this.toSafeProfile(user);
  }

  async setPasswordResetToken(userId: string, tokenHash: string, expiresAtIso: string): Promise<void> {
    const user = await this.findById(userId);
    if (!user) return;
    user.passwordResetTokenHash = tokenHash;
    user.passwordResetExpiresAt = expiresAtIso;
    user.updatedAt = new Date().toISOString();
    this.users.set(userId, user);
    this.persistToDisk();
  }

  async findByValidPasswordResetToken(tokenHash: string): Promise<MongoUser | null> {
    const now = Date.now();
    for (const user of this.users.values()) {
      if (
        user.passwordResetTokenHash === tokenHash &&
        user.passwordResetExpiresAt &&
        new Date(user.passwordResetExpiresAt).getTime() > now
      ) {
        return user;
      }
    }
    return null;
  }

  async completePasswordReset(userId: string, newPasswordHash: string): Promise<void> {
    const user = await this.findById(userId);
    if (!user) throw new Error('User not found');
    user.passwordHash = newPasswordHash;
    delete user.passwordResetTokenHash;
    delete user.passwordResetExpiresAt;
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    user.updatedAt = new Date().toISOString();
    this.users.set(userId, user);
    this.persistToDisk();
  }

  private toSafeProfile(user: MongoUser): SafeUserProfile {
    const safe = { ...user };
    delete safe.passwordHash;
    delete safe.tokenVersion;
    delete safe.mfaSecret;
    delete safe.mfaPendingSecret;
    delete safe.mfaLastUsedStep;
    delete safe.mfaRecoveryCodeHashes;
    delete safe.passwordResetTokenHash;
    delete safe.passwordResetExpiresAt;
    return safe;
  }
}

export const mongoUserService = new MongoUserService();
