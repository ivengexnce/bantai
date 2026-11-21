import { AIModelDescriptor } from '../types';

export const APP_NAME = 'BANTAI';
export const APP_TAGLINE = 'Apna Model. Apna Dimaag. Apna AI.';
export const APP_VERSION = '1.0.0';

// List of evaluated Open-Weight Foundation Models
export const SUPPORTED_MODELS: AIModelDescriptor[] = [
  {
    id: 'qwen2.5:7b',
    displayName: 'Qwen 2.5 7B Instruct (Recommended)',
    backend: 'ollama',
    parameters: '7B',
    contextLength: 32768,
    quantization: 'Q4_K_M',
    isDownloaded: true,
    isLoaded: true,
    vramRequiredMB: 5120,
    description: 'Outstanding multilingual reasoning, Hinglish understanding, coding, and tool calling capabilities with minimal VRAM.',
    license: 'Apache 2.0',
    family: 'qwen'
  },
  {
    id: 'llama3.1:8b',
    displayName: 'Llama 3.1 8B Instruct',
    backend: 'ollama',
    parameters: '8B',
    contextLength: 131072,
    quantization: 'Q4_K_M',
    isDownloaded: false,
    isLoaded: false,
    vramRequiredMB: 5800,
    description: 'Meta open weights with massive 128k context window, strong general reasoning and structured tool calling.',
    license: 'Llama 3.1 Community License',
    family: 'llama'
  },
  {
    id: 'gemma2:9b',
    displayName: 'Gemma 2 9B Instruct',
    backend: 'ollama',
    parameters: '9B',
    contextLength: 8192,
    quantization: 'Q4_K_M',
    isDownloaded: false,
    isLoaded: false,
    vramRequiredMB: 6500,
    description: 'High performance Google open-weight architecture with sliding window attention and strong factual grounding.',
    license: 'Gemma Terms of Use',
    family: 'gemma'
  },
  {
    id: 'qwen2.5-coder:7b',
    displayName: 'Qwen 2.5 Coder 7B',
    backend: 'ollama',
    parameters: '7B',
    contextLength: 32768,
    quantization: 'Q4_K_M',
    isDownloaded: false,
    isLoaded: false,
    vramRequiredMB: 5120,
    description: 'Specialized for coding, architecture, refactoring, and AST manipulation in Developer Mode.',
    license: 'Apache 2.0',
    family: 'qwen'
  }
];

export const DEFAULT_MODEL_ID = 'qwen2.5:7b';

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
