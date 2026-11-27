import { AIModelDescriptor } from '../types';

export const APP_NAME = 'BANTAI';
export const APP_TAGLINE = 'Apna Model. Apna Dimaag. Apna AI.';
export const APP_VERSION = '1.0.0';

// Official BANTAI Local Model Lineup
export const SUPPORTED_MODELS: AIModelDescriptor[] = [
  {
    id: 'chhotu',
    name: 'BANTAI Chhotu',
    shortName: 'Chhotu',
    displayName: 'BANTAI Chhotu ⚡',
    baseModel: 'qwen2.5:3b',
    icon: '⚡',
    color: '#3B82F6',
    tagline: 'Compact speed, everyday reliability.',
    description: 'Fast, lightweight local assistant ideal for quick lookups, mobile workflows, and low-RAM laptops.',
    useCase: 'Quick replies, mobile, low hardware',
    hardware: 'Runs anywhere (CPU, mobile)',
    ramRequirement: '4 GB',
    vramRequirement: 'None required',
    speedRating: 12,
    powerRating: 4,
    speedLabel: 'Fastest',
    powerLabel: 'Light',
    switchMessage: 'Switched to BANTAI Chhotu ⚡ Running light and responsive.',
    backend: 'ollama',
    parameters: '3B',
    contextLength: 32768,
    quantization: 'Q4_K_M',
    isDownloaded: true,
    isLoaded: true,
    vramRequiredMB: 2048,
    isDefault: false,
    license: 'Apache 2.0',
    family: 'qwen'
  },
  {
    id: 'bhai',
    name: 'BANTAI Bhai',
    shortName: 'Bhai',
    displayName: 'BANTAI Bhai 🤝',
    baseModel: 'qwen2.5:7b',
    icon: '🤝',
    color: '#10B981',
    tagline: 'Balanced intelligence for daily engineering & writing.',
    description: 'Your everyday local driver. Handles coding, structured reasoning, and natural bilingual Hinglish/English clearly and accurately.',
    useCase: 'Daily use, default for all users',
    hardware: 'Standard GPU, daily machine',
    ramRequirement: '8 GB',
    vramRequirement: '6 GB',
    speedRating: 9,
    powerRating: 8,
    speedLabel: 'Fast',
    powerLabel: 'Solid',
    switchMessage: 'Switched to BANTAI Bhai 🤝 Ready for work.',
    backend: 'ollama',
    parameters: '7B',
    contextLength: 32768,
    quantization: 'Q4_K_M',
    isDownloaded: true,
    isLoaded: true,
    vramRequiredMB: 5120,
    isDefault: true,
    license: 'Apache 2.0',
    family: 'qwen'
  }
];

export const DEFAULT_MODEL_ID = 'bhai';

export function resolveModel(modelId?: string): AIModelDescriptor {
  if (!modelId) return SUPPORTED_MODELS[1]; // Default to BANTAI Bhai
  const normalized = modelId.toLowerCase().trim();
  const found = SUPPORTED_MODELS.find(
    m => m.id === normalized ||
         m.baseModel.toLowerCase() === normalized ||
         m.shortName.toLowerCase() === normalized ||
         m.name.toLowerCase() === normalized
  );
  return found || SUPPORTED_MODELS[1];
}

// Local Embedding Model Details
export const LOCAL_EMBEDDING_MODEL = {
  id: 'BAAI/bge-small-en-v1.5',
  dimensions: 384,
  maxSequenceLength: 512,
  description: 'Fast, high-accuracy, 100% locally executed text embeddings for RAG and personal memory search.'
};

// Tool categories and registry identifiers
export const TOOL_NAMES = {
  CALCULATOR: 'calculator',
  DOCUMENT_READER: 'document_reader',
  FILE_SEARCH: 'file_search',
  DATABASE_RETRIEVAL: 'database_retrieval',
  RAG_RETRIEVAL: 'rag_retrieval',
  SANDBOX_CODE_EXECUTOR: 'sandbox_code_executor',
  TASK_MANAGER: 'task_manager',
  REMINDER_SCHEDULER: 'reminder_scheduler',
  CALENDAR_CONNECTOR: 'calendar_connector',
  EMAIL_CONNECTOR: 'email_connector'
} as const;

export const DEFAULT_USER_PREFERENCES = {
  theme: 'dark' as const,
  language: 'hinglish' as const,
  defaultPersonalityMode: 'balanced' as const,
  voiceSpeed: 1.0,
  voiceGender: 'male' as const,
  soundEffectsEnabled: true,
  proactiveBriefingEnabled: true
};

export const DEFAULT_LEARNING_CONSENT = {
  personalMemoryEnabled: true,
  crossUserTrainingOptIn: false, // Strictly false by default
  consentTimestamp: null,
  policyVersion: '1.0.0-2026',
  allowAnalytics: false,
  withdrawnAt: null
};
