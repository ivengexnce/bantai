import { AIModelDescriptor } from '../types';

export const APP_NAME = 'BANTAI';
export const APP_TAGLINE = 'Apna Model. Apna Dimaag. Apna AI.';
export const APP_VERSION = '1.0.0';

// Official BANTAI Model Family Lineup (Nov 21, 2026 Branding Spec)
export const SUPPORTED_MODELS: AIModelDescriptor[] = [
  {
    id: 'chhotu',
    name: 'BANTAI Chhotu',
    shortName: 'Chhotu',
    displayName: 'BANTAI Chhotu ⚡',
    baseModel: 'qwen2.5:3b',
    icon: '⚡',
    color: '#3B82F6',
    tagline: 'Chhota packet, bada kaam.',
    description: 'Best for quick questions, casual chat and low-power devices. Lightning fast and surprisingly capable. Runs anywhere without breaking a sweat.',
    useCase: 'Quick replies, mobile, low hardware',
    hardware: 'Runs anywhere (CPU, mobile)',
    ramRequirement: '4 GB',
    vramRequirement: 'None required',
    speedRating: 12,
    powerRating: 4,
    speedLabel: 'Fastest',
    powerLabel: 'Light',
    switchMessage: 'Switched to BANTAI Chhotu ⚡ Running light. Ready to go.',
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
    tagline: 'Har kaam ke liye, har waqt ready.',
    description: 'Your everyday go-to. Handles coding, writing, reasoning and Hinglish like a natural. Balanced, reliable and always ready. Default for all users.',
    useCase: 'Daily use, default for all users',
    hardware: 'Standard GPU, daily machine',
    ramRequirement: '8 GB',
    vramRequirement: '6 GB',
    speedRating: 9,
    powerRating: 8,
    speedLabel: 'Fast',
    powerLabel: 'Solid',
    switchMessage: 'Switched to BANTAI Bhai 🤝 Default mode. Ekdum sahi.',
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
  },
  {
    id: 'ustad',
    name: 'BANTAI Ustad',
    shortName: 'Ustad',
    displayName: 'BANTAI Ustad 🎯',
    baseModel: 'qwen2.5:14b',
    icon: '🎯',
    color: '#F59E0B',
    tagline: 'Jab kaam serious ho, Ustad ko bulao.',
    description: 'Deep reasoning, complex code, long documents and agentic tasks. When Bhai is not enough, Ustad steps in and handles it properly.',
    useCase: 'Complex reasoning, coding, agents',
    hardware: 'Dedicated GPU setup',
    ramRequirement: '16 GB',
    vramRequirement: '10 GB',
    speedRating: 6,
    powerRating: 10,
    speedLabel: 'Moderate',
    powerLabel: 'Powerful',
    switchMessage: "Switched to BANTAI Ustad 🎯 Serious mode on. Let's work.",
    backend: 'ollama',
    parameters: '14B',
    contextLength: 32768,
    quantization: 'Q4_K_M',
    isDownloaded: false,
    isLoaded: false,
    vramRequiredMB: 9800,
    isDefault: false,
    license: 'Apache 2.0',
    family: 'qwen'
  },
  {
    id: 'don',
    name: 'BANTAI Don',
    shortName: 'Don',
    displayName: 'BANTAI Don 👑',
    baseModel: 'qwen2.5:32b',
    icon: '👑',
    color: '#DC2626',
    tagline: 'Seedha Don level. No explanation needed.',
    description: 'Maximum intelligence. No shortcuts. No compromises. Reserved for the tasks that actually matter. When nothing else will do.',
    useCase: 'Maximum power, heavy tasks',
    hardware: 'High-end GPU, server',
    ramRequirement: '32 GB',
    vramRequirement: '20 GB',
    speedRating: 4,
    powerRating: 12,
    speedLabel: 'Patient',
    powerLabel: 'Absolute',
    switchMessage: 'Switched to BANTAI Don 👑 Don has entered. Choose your words wisely.',
    backend: 'ollama',
    parameters: '32B',
    contextLength: 32768,
    quantization: 'Q4_K_M',
    isDownloaded: false,
    isLoaded: false,
    vramRequiredMB: 20480,
    isDefault: false,
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
  defaultPersonalityMode: 'tapori' as const,
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
