import { getSystemPromptForMode, PersonalityMode, SafeUserProfile } from '@bantai/shared';
import { mongoUserService } from '../database/mongo.service';
import fs from 'fs';
import path from 'path';
import { config } from '../../config/env';

export interface TrainingExample {
  id: string;
  sourceUserId: string;
  personalityMode?: PersonalityMode;
  systemPrompt?: string;
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

  constructor(baseDir: string = config.dataDir) {
    this.datasetsDir = path.resolve(baseDir, 'learning_datasets');
    if (!fs.existsSync(this.datasetsDir)) {
      fs.mkdirSync(this.datasetsDir, { recursive: true, mode: 0o700 });
    }
  }

  /**
   * PII Sanitizer: Redacts API keys, JWT/Bearer tokens, DB credentials, emails, and phone numbers
   */
  public scrubPII(text: string): { cleanText: string; hadPII: boolean } {
    let clean = text;
    let hadPII = false;

    const redact = (regex: RegExp, token: string) => {
      regex.lastIndex = 0;
      if (regex.test(clean)) {
        clean = clean.replace(regex, token);
        hadPII = true;
      }
    };

    // 1. Secret tokens, Bearer auth, JWTs, AWS keys, and DB URIs (highest priority before phones)
    redact(/(sk-[a-zA-Z0-9_\-]{16,}|ghp_[a-zA-Z0-9_\-]{20,}|AIza[0-9A-Za-z-_]{35}|AKIA[0-9A-Z]{16})/g, '[REDACTED_TOKEN]');
    redact(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED_TOKEN]');
    redact(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}/g, '[REDACTED_TOKEN]');
    redact(/((?:mongodb(?:\+srv)?|postgres(?:ql)?|redis):\/\/[^:\s/@]+:)([^@\s/]+)(@)/gi, '$1[REDACTED_SECRET]$3');

    // 2. Email regex
    redact(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g, '[REDACTED_EMAIL]');

    // 3. Phone regex (international & Indian formats with word boundaries)
    redact(/(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g, '[REDACTED_PHONE]');

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
    correction?: string,
    personalityMode: PersonalityMode = 'balanced'
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
      personalityMode,
      systemPrompt: getSystemPromptForMode(personalityMode),
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
    fs.appendFileSync(bufferFile, JSON.stringify(example) + '\n', { encoding: 'utf8', mode: 0o600 });

    return example;
  }

  /**
   * Purge all collected training examples belonging to a specific user (consent withdrawal / GDPR wipe)
   */
  public purgeUserExamples(userId: string): number {
    const bufferFile = path.join(this.datasetsDir, 'approved_examples_buffer.jsonl');
    if (!fs.existsSync(bufferFile)) return 0;

    const lines = fs.readFileSync(bufferFile, 'utf8').split('\n').filter(Boolean);
    const retained: string[] = [];
    let removed = 0;

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line) as TrainingExample;
        if (parsed.sourceUserId === userId) {
          removed++;
          continue;
        }
        retained.push(line);
      } catch {
        // Drop corrupted lines safely
      }
    }

    const payload = retained.length > 0 ? retained.join('\n') + '\n' : '';
    const tmp = `${bufferFile}.tmp.${process.pid}.${Date.now()}`;
    fs.writeFileSync(tmp, payload, { encoding: 'utf8', mode: 0o600 });
    try {
      fs.renameSync(tmp, bufferFile);
    } catch {
      fs.writeFileSync(bufferFile, payload, { encoding: 'utf8', mode: 0o600 });
      try {
        fs.unlinkSync(tmp);
      } catch {
        // ignore
      }
    }

    return removed;
  }

  /**
   * Export versioned training dataset splits (train / val / test)
   */
  async exportDatasetSplits(versionTag: string = `v1_${Date.now()}`): Promise<DatasetManifest> {
    if (!/^[a-zA-Z0-9._-]{1,64}$/.test(versionTag) || versionTag.includes('..')) {
      throw new Error('Invalid dataset version tag.');
    }

    const bufferFile = path.join(this.datasetsDir, 'approved_examples_buffer.jsonl');
    let examples: TrainingExample[] = [];

    if (fs.existsSync(bufferFile)) {
      const lines = fs.readFileSync(bufferFile, 'utf8').split('\n').filter(Boolean);
      const parsed = lines.map(l => JSON.parse(l) as TrainingExample);

      // Re-verify live opt-in consent and user existence at export time
      const userConsentCache = new Map<string, boolean>();
      for (const item of parsed) {
        if (item.sourceUserId === 'system_curated') {
          examples.push(item);
          continue;
        }
        if (!userConsentCache.has(item.sourceUserId)) {
          const check = await this.canIngestForTraining(item.sourceUserId);
          userConsentCache.set(item.sourceUserId, check.allowed);
        }
        if (userConsentCache.get(item.sourceUserId)) {
          examples.push(item);
        }
      }
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

    const baseResolved = path.resolve(this.datasetsDir);
    const versionDir = path.resolve(baseResolved, versionTag);
    if (!versionDir.startsWith(baseResolved + path.sep)) {
      throw new Error('Path traversal rejected in dataset version directory.');
    }
    if (!fs.existsSync(versionDir)) {
      fs.mkdirSync(versionDir, { recursive: true, mode: 0o700 });
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
          { role: 'user', content: 'QuickSort ka average aur worst-case time complexity kya hai?' },
          { role: 'assistant', content: 'Quicksort ki average time complexity O(n log n) hoti hai aur space O(log n). Worst case mein yeh O(n^2) jaati hai jab pivot selection unbalanced ho (for example, already sorted array par fixed end-pivot lena).' }
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
          { role: 'user', content: 'Explain REST vs GraphQL concisely in natural Hinglish.' },
          { role: 'assistant', content: 'REST aur GraphQL mein main difference response structure ka hai: REST mein fixed endpoints fixed payload bhejte hain (jisse over-fetching ya under-fetching ho sakti hai), jabki GraphQL mein ek single endpoint par client exact zaroori fields request karta hai.' }
        ],
        qualityScore: 1.0,
        piiScrubbed: false,
        collectedAt: new Date().toISOString()
      }
    ];
  }
}

export const learningService = new LearningService();
