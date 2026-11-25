// BANTAI Shared Type Definitions

export type PersonalityMode = 'tapori' | 'balanced' | 'professional' | 'developer' | 'academic';

export type UserRole = 'user' | 'admin' | 'moderator';

export type AccountStatus = 'active' | 'suspended' | 'pending_verification' | 'deleted';

// ==========================================
// MONGODB SCHEMA TYPES (User Info ONLY)
// Strictly forbidden to store conversation messages or chat history here.
// ==========================================

export interface UserPreferences {
  theme: 'dark' | 'light' | 'system';
  language: 'hinglish' | 'hindi' | 'english';
  defaultPersonalityMode: PersonalityMode;
  voiceSpeed: number; // e.g. 1.0
  voiceGender: 'male' | 'female';
  soundEffectsEnabled: boolean;
  proactiveBriefingEnabled: boolean;
}

export interface LearningConsent {
  personalMemoryEnabled: boolean; // Enables user-isolated persistent memory
  crossUserTrainingOptIn: boolean; // STRICT OPT-IN: Disabled by default
  consentTimestamp: string | null;
  policyVersion: string;
  allowAnalytics: boolean;
  withdrawnAt: string | null;
}

export interface MongoUser {
  userId: string; // Immutable unique identifier shared with Firebase
  email: string;
  name: string;
  username: string;
  passwordHash?: string; // Nullable if OAuth only (Argon2 / bcrypt)
  avatarUrl?: string;
  role: UserRole;
  status: AccountStatus;
  preferences: UserPreferences;
  learningConsent: LearningConsent;
  subscriptionPlan: 'free' | 'pro' | 'enterprise';
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
  oauthProvider?: 'google' | 'local';
  oauthId?: string;
  tokenVersion?: number;
  mfaEnabled?: boolean;
  mfaSecret?: string;
  mfaPendingSecret?: string;
  mfaLastUsedStep?: number;
  mfaRecoveryCodeHashes?: string[];
  passwordResetTokenHash?: string;
  passwordResetExpiresAt?: string;
}

// Safe public/session user profile (omits password hash and all internal security tokens/secrets)
export type SafeUserProfile = Omit<
  MongoUser,
  | 'passwordHash'
  | 'tokenVersion'
  | 'mfaSecret'
  | 'mfaPendingSecret'
  | 'mfaLastUsedStep'
  | 'mfaRecoveryCodeHashes'
  | 'passwordResetTokenHash'
  | 'passwordResetExpiresAt'
>;

// ==========================================
// FIREBASE FIRESTORE SCHEMA TYPES
// Covers conversations, messages, assistant data, memory, tasks, reminders
// ==========================================

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface Attachment {
  id: string;
  filename: string;
  fileType: string;
  mimeType: string;
  sizeBytes: number;
  storageUrl: string;
  uploadedAt: string;
  extractedTextSnippet?: string;
}

export interface ToolCallExecution {
  id: string;
  toolName: string;
  parameters: Record<string, unknown>;
  status: 'pending' | 'requires_approval' | 'approved' | 'rejected' | 'executing' | 'completed' | 'failed';
  result?: unknown;
  error?: string;
  startedAt: string;
  completedAt?: string;
}

export interface MessageFeedback {
  rating: 'up' | 'down';
  reason?: 'inaccurate' | 'unhelpful' | 'out_of_character' | 'hallucination' | 'other';
  correctionText?: string;
  submittedAt: string;
}

export interface FirestoreMessage {
  id: string;
  conversationId: string;
  userId: string;
  role: MessageRole;
  content: string;
  personalityMode: PersonalityMode;
  modelUsed?: string;
  toolCalls?: ToolCallExecution[];
  attachments?: Attachment[];
  feedback?: MessageFeedback;
  tokensPrompt?: number;
  tokensCompletion?: number;
  totalTokens?: number;
  createdAt: string;
}

export interface FirestoreConversation {
  id: string;
  userId: string;
  title: string;
  personalityMode: PersonalityMode;
  modelId: string;
  messageCount: number;
  isArchived: boolean;
  isPinned: boolean;
  tags?: string[];
  summary?: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
}

// Tasks & Reminders
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface TaskSubtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface FirestoreTask {
  id: string;
  userId: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string; // ISO 8601
  subtasks?: TaskSubtask[];
  tags?: string[];
  recurring?: 'none' | 'daily' | 'weekly' | 'monthly';
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FirestoreReminder {
  id: string;
  userId: string;
  title: string;
  scheduledTime: string; // ISO 8601
  timezone: string;
  recurring?: 'none' | 'daily' | 'weekly' | 'monthly';
  status: 'scheduled' | 'fired' | 'dismissed' | 'cancelled';
  channel: 'in_app' | 'push' | 'both';
  createdAt: string;
}

// Personal Memory Item
export type MemoryCategory = 'preference' | 'fact' | 'project' | 'goal' | 'instruction';

export interface FirestoreMemory {
  id: string;
  userId: string;
  key: string;
  category: MemoryCategory;
  content: string;
  confidence: number; // 0.0 - 1.0
  sourceConversationId?: string;
  createdAt: string;
  updatedAt: string;
}

// Calendar Event
export interface FirestoreCalendarEvent {
  id: string;
  userId: string;
  title: string;
  description?: string;
  startTime: string; // ISO 8601
  endTime: string;
  location?: string;
  attendees?: string[];
  isAllDay?: boolean;
  hasConflict?: boolean;
  createdAt: string;
  updatedAt: string;
}

// Email Draft
export interface FirestoreEmailDraft {
  id: string;
  userId: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'sent' | 'cancelled';
  sourcePrompt?: string;
  createdAt: string;
  updatedAt: string;
}

// Knowledge Base Document Record
export interface FirestoreKnowledgeDoc {
  id: string;
  userId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storageUrl: string;
  chunkCount: number;
  embeddingModel: string;
  summary?: string;
  extractedKeywords?: string[];
  createdAt: string;
}

// ==========================================
// AGENTIC ENGINE & TOOLS
// ==========================================

export interface AgentPlanStep {
  stepIndex: number;
  action: string;
  toolName: string;
  arguments: Record<string, unknown>;
  requiresApproval: boolean;
  rationale: string;
  status: 'pending' | 'approved' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  result?: unknown;
  error?: string;
}

export interface AgentExecutionPlan {
  planId: string;
  userId: string;
  conversationId: string;
  goal: string;
  steps: AgentPlanStep[];
  currentStepIndex: number;
  status: 'planning' | 'waiting_approval' | 'executing' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
  requiresApproval: boolean;
  category: 'system' | 'assistant' | 'productivity' | 'retrieval' | 'execution';
}

// ==========================================
// SELF-HOSTED AI INFERENCE MODELS
// ==========================================

export type InferenceBackend = 'ollama' | 'llamacpp' | 'vllm' | 'transformers' | 'local_engine';

export interface AIModelDescriptor {
  id: string;
  name: string;
  shortName: string;
  displayName: string;
  baseModel: string;
  icon: string;
  color: string;
  tagline: string;
  description: string;
  useCase: string;
  hardware: string;
  ramRequirement: string;
  vramRequirement: string;
  speedRating: number; // out of 12
  powerRating: number; // out of 12
  speedLabel: string;
  powerLabel: string;
  switchMessage: string;
  backend: InferenceBackend;
  parameters: string; // e.g. "3B", "7B", "14B", "32B"
  contextLength: number;
  quantization?: string; // e.g. "Q4_K_M", "FP16"
  isDownloaded: boolean;
  isLoaded: boolean;
  vramRequiredMB: number;
  isDefault: boolean;
  license: string;
  family: 'qwen' | 'llama' | 'gemma' | 'mistral' | 'other';
}

// Stream chunk format for frontend SSE
export interface ChatStreamChunk {
  type: 'token' | 'thought' | 'tool_call' | 'tool_result' | 'done' | 'error';
  content?: string;
  toolCall?: ToolCallExecution;
  conversationId?: string;
  messageId?: string;
  finishReason?: 'stop' | 'length' | 'tool_calls' | 'error';
  error?: string;
}
