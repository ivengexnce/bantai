import { SafeUserProfile } from '@bantai/shared';
import { mongoUserService } from '../database/mongo.service';
import fs from 'fs';
import path from 'path';

export interface TrainingExample {
  id: string;
  sourceUserId: string;
  consentTimestamp: string;
  policyVersion: string;
  messages: Array<{
    role: string;
    content: string;
  }>;
  qualityScore: number;
  piiScrubbed: boolean;
  collectedAt: string;
}

export interface DatasetManifest {
  version: string;
  createdAt: string;
  totalExamples: number;
  trainCount: number;
  valCount: number;
  testCount: number;
  trainFile: string;
  valFile: string;
  testFile: string;
}

/**
 * Continuous Learning & Fine-Tuning Pipeline Service
 * 
 * Strict compliance with opt-in consent:
 * Cross-user model training is STRICTLY OPT-IN and DISABLED BY DEFAULT.
 * Includes PII screening, data provenance tracking, versioned JSONL dataset creation,
 * and train/val/test split preparation.
 */
export class LearningService {
  private datasetsDir: string;

  constructor(baseDir: string = './data') {
    this.datasetsDir = path.join(baseDir, 'learning_datasets');
    if (!fs.existsSync(this.datasetsDir)) {
      fs.mkdirSync(this.datasetsDir, { recursive: true });
    }
  }

  /**
   * PII Sanitizer: Redacts API keys, emails, and phone numbers in priority order
   */
  public scrubPII(text: string): { cleanText: string; hadPII: boolean } {
    let clean = text;
    let hadPII = false;

    // 1. Generic API Key / Secret tokens (must run before phone regex to prevent splitting)
    const keyRegex = /(sk-[a-zA-Z0-9_\-]{16,}|ghp_[a-zA-Z0-9_\-]{20,}|AIza[0-9A-Za-z-_]{35})/g;
    if (keyRegex.test(clean)) {
      clean = clean.replace(keyRegex, '[REDACTED_TOKEN]');
      hadPII = true;
    }

    // 2. Email regex
    const emailRegex = /[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g;
    if (emailRegex.test(clean)) {
      clean = clean.replace(emailRegex, '[REDACTED_EMAIL]');
      hadPII = true;
    }

    // 3. Phone regex (international & Indian formats with word boundaries)
    const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g;
    if (phoneRegex.test(clean)) {
      clean = clean.replace(phoneRegex, '[REDACTED_PHONE]');
      hadPII = true;
    }

    return { cleanText: clean, hadPII };
  }

  /**
   * Evaluates if a conversation can be ingested for model fine-tuning.
   * STRICT OPT-IN: User must have explicitly opted into cross-user training!
   */
  async canIngestForTraining(userId: string): Promise<{
    allowed: boolean;
    userProfile?: SafeUserProfile;
    reason?: string;
  }> {
    const user = await mongoUserService.findById(userId);
    if (!user) {
      return { allowed: false, reason: 'User not found' };
    }

    if (!user.learningConsent || !user.learningConsent.crossUserTrainingOptIn) {
      return {
        allowed: false,
        reason: 'User has NOT given explicit opt-in consent for cross-user model training.'
      };
    }

    if (user.learningConsent.withdrawnAt) {
      return {
        allowed: false,
        reason: 'User previously withdrew consent for model training.'
      };
    }

    return { allowed: true, userProfile: user };
  }

  /**
   * Collect high-quality feedback example into training buffer
   */
  async recordTrainingExample(
    userId: string,
    userQuery: string,
    assistantResponse: string,
    feedbackRating: 'up' | 'down',
    correction?: string
  ): Promise<TrainingExample | null> {
    const consentCheck = await this.canIngestForTraining(userId);
    if (!consentCheck.allowed || !consentCheck.userProfile) {
      return null; // Silently discard per privacy rules
    }

    const targetResponse = correction || assistantResponse;
    if (!targetResponse || targetResponse.trim().length < 10) {
      return null; // Skip low-information responses
    }

    const scrubbedQuery = this.scrubPII(userQuery);
    const scrubbedResp = this.scrubPII(targetResponse);

    const example: TrainingExample = {
      id: `ex_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      sourceUserId: userId,
      consentTimestamp: consentCheck.userProfile.learningConsent.consentTimestamp || new Date().toISOString(),
      policyVersion: consentCheck.userProfile.learningConsent.policyVersion,
      messages: [
        { role: 'user', content: scrubbedQuery.cleanText },
        { role: 'assistant', content: scrubbedResp.cleanText }
      ],
      qualityScore: feedbackRating === 'up' ? 1.0 : (correction ? 0.9 : 0.4),
      piiScrubbed: scrubbedQuery.hadPII || scrubbedResp.hadPII,
      collectedAt: new Date().toISOString()
    };

    const bufferFile = path.join(this.datasetsDir, 'approved_examples_buffer.jsonl');
    fs.appendFileSync(bufferFile, JSON.stringify(example) + '\n', 'utf8');

    return example;
  }

  /**
   * Export versioned training dataset splits (train / val / test)
   */
  async exportDatasetSplits(versionTag: string = `v1_${Date.now()}`): Promise<DatasetManifest> {
    const bufferFile = path.join(this.datasetsDir, 'approved_examples_buffer.jsonl');
    let examples: TrainingExample[] = [];

    if (fs.existsSync(bufferFile)) {
      const lines = fs.readFileSync(bufferFile, 'utf8').split('\n').filter(Boolean);
      examples = lines.map(l => JSON.parse(l));
    }

    // Add baseline exemplar pairs if buffer is small to allow initial pipeline execution
    if (examples.length < 5) {
      examples.push(...this.getBaselineExemplars());
    }

    // Filter quality >= 0.7
    const highQuality = examples.filter(e => e.qualityScore >= 0.7);

    // Shuffle
    const shuffled = [...highQuality].sort(() => 0.5 - Math.random());
    const total = shuffled.length;

    const trainIdx = Math.floor(total * 0.8);
    const valIdx = Math.floor(total * 0.9);

    const train = shuffled.slice(0, trainIdx);
    const val = shuffled.slice(trainIdx, valIdx);
    const test = shuffled.slice(valIdx);

    const versionDir = path.join(this.datasetsDir, versionTag);
    if (!fs.existsSync(versionDir)) {
      fs.mkdirSync(versionDir, { recursive: true });
    }

    const trainFile = path.join(versionDir, 'train.jsonl');
    const valFile = path.join(versionDir, 'val.jsonl');
    const testFile = path.join(versionDir, 'test.jsonl');

    fs.writeFileSync(trainFile, train.map(e => JSON.stringify(e)).join('\n'), 'utf8');
    fs.writeFileSync(valFile, val.map(e => JSON.stringify(e)).join('\n'), 'utf8');
    fs.writeFileSync(testFile, test.map(e => JSON.stringify(e)).join('\n'), 'utf8');

    const manifest: DatasetManifest = {
      version: versionTag,
      createdAt: new Date().toISOString(),
      totalExamples: total,
      trainCount: train.length,
      valCount: val.length,
      testCount: test.length,
      trainFile,
      valFile,
      testFile
    };

    fs.writeFileSync(
      path.join(versionDir, 'manifest.json'),
      JSON.stringify(manifest, null, 2),
      'utf8'
    );

    return manifest;
  }

  private getBaselineExemplars(): TrainingExample[] {
    return [
      {
        id: 'seed_1',
        sourceUserId: 'system_curated',
        consentTimestamp: new Date().toISOString(),
        policyVersion: '1.0.0-2026',
        messages: [
          { role: 'user', content: 'Bantai, quicksort ka time complexity kya hai?' },
          { role: 'assistant', content: 'Arey bhidu! Quicksort ka average time complexity O(n log n) hota hai, par worst case me O(n^2) chala jata hai agar pivot ekdum faltu choose hua toh. Best case me bhi O(n log n) rehta hai bantai!' }
        ],
        qualityScore: 1.0,
        piiScrubbed: false,
        collectedAt: new Date().toISOString()
      },
      {
        id: 'seed_2',
        sourceUserId: 'system_curated',
        consentTimestamp: new Date().toISOString(),
        policyVersion: '1.0.0-2026',
        messages: [
          { role: 'user', content: 'Explain REST vs GraphQL in Mumbai style.' },
          { role: 'assistant', content: 'Suno bantai! REST bole toh thali system — pura packet ek sath aayega chahe tu sirf roti khaye ya daal. Aur GraphQL bole toh buffet system — plate utha aur jitna item maangta hai utna hi le! Over-fetching ka jhanjhat hi khatam!' }
        ],
        qualityScore: 1.0,
        piiScrubbed: false,
        collectedAt: new Date().toISOString()
      }
    ];
  }
}

export const learningService = new LearningService();
