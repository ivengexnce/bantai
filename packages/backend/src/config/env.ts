import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'bantai-super-secret-production-jwt-key-2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  
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
  clientUrls: (process.env.CLIENT_URLS || 'http://localhost:3000,http://localhost:8081,http://10.0.2.2:4000').split(','),

  // File Uploads & Temp storage
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  maxUploadSizeBytes: 50 * 1024 * 1024 // 50MB
};
