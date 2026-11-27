import dotenv from 'dotenv';
import crypto from 'crypto';
dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';

const KNOWN_WEAK_JWT_SECRETS = new Set([
  'bantai-super-secret-production-jwt-key-2026',
  'bantai-super-secret-production-jwt-key-change-in-prod-2026',
  'changeme',
  'secret',
  'default'
]);

function resolveJwtSecret(): string {
  const raw = (process.env.JWT_SECRET || '').trim();
  const isWeak = !raw || raw.length < 32 || KNOWN_WEAK_JWT_SECRETS.has(raw);

  if (nodeEnv === 'production' && isWeak) {
    throw new Error(
      '[SECURITY FATAL] Missing or weak JWT_SECRET in production. Set a strong secret (>= 32 chars, e.g. `openssl rand -hex 64`).'
    );
  }

  if (isWeak) {
    if (nodeEnv !== 'test') {
      console.warn('[SECURITY WARN] Using ephemeral CSPRNG JWT_SECRET for non-production session. Set strong JWT_SECRET in .env.');
    }
    return crypto.randomBytes(48).toString('hex');
  }

  return raw;
}

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv,
  jwtSecret: resolveJwtSecret(),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  jwtIssuer: process.env.JWT_ISSUER || 'bantai-api',
  jwtAudience: process.env.JWT_AUDIENCE || 'bantai-client',
  trustProxy: process.env.TRUST_PROXY || (nodeEnv === 'production' ? '1' : 'false'),
  dataDir: process.env.DATA_DIR || './data',

  // Database Configuration — STRICT SEPARATION
  // MongoDB: User account and profile ONLY
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/bantai_users',

  // Firebase: Conversations, messages, storage
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID || 'bantai-production',
  firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
  firebasePrivateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'bantai-production.appspot.com',

  // Self-Hosted AI Inference
  // Strictly NO external third-party inference APIs (no OpenAI, no Anthropic, etc.)
  inferenceProvider: (process.env.INFERENCE_PROVIDER || 'ollama') as 'ollama' | 'llamacpp' | 'vllm' | 'local_engine',
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  llamacppBaseUrl: process.env.LLAMACPP_BASE_URL || 'http://localhost:8080',
  vllmBaseUrl: process.env.VLLM_BASE_URL || 'http://localhost:8000',
  defaultModel: process.env.DEFAULT_MODEL || 'qwen2.5:7b',

  // Client URLs for CORS
  clientUrls: (process.env.CLIENT_URLS || 'http://localhost:3000,http://localhost:3001,http://localhost:8081,http://10.0.2.2:4000')
    .split(',')
    .map(u => u.trim())
    .filter(Boolean),

  // ElevenLabs Voice Synthesis Integration (strictly server-side secret)
  elevenlabsApiKey: process.env.ELEVENLABS_API_KEY || '',

  // OAuth Simulation Gate (strictly disabled unless explicit dev flag is set)
  enableDevMockOAuth: nodeEnv === 'development' && process.env.ENABLE_DEV_MOCK_OAUTH === 'true',

  // File Uploads & Temp storage
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  maxUploadSizeBytes: 2 * 1024 * 1024, // 2MB JSON / document bound

  // Multi-instance State Store (optional Redis URL; durable disk persistence by default)
  redisUrl: (process.env.REDIS_URL || '').trim(),

  // SMTP / Password Reset Email Delivery (writes to local outbox JSONL if SMTP_HOST unset)
  smtpHost: (process.env.SMTP_HOST || '').trim(),
  smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
  smtpSecure: process.env.SMTP_SECURE === 'true',
  smtpUser: (process.env.SMTP_USER || '').trim(),
  smtpPass: (process.env.SMTP_PASS || '').trim(),
  smtpFrom: (process.env.SMTP_FROM || 'no-reply@bantai.local').trim(),

  // ElevenLabs Per-User Daily Character Cap (protects server-side API bill; 0 disables hosted TTS)
  elevenlabsMaxCharsPerUserDay: Math.max(
    0,
    parseInt(process.env.ELEVENLABS_MAX_CHARS_PER_USER_DAY || '20000', 10) || 20000
  ),

  // Explicit opt-in Local Workstation Mode (strictly restricted to direct loopback sockets)
  localWorkstationMode: process.env.BANTAI_LOCAL_WORKSTATION === 'true'
};
