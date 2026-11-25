import { z } from 'zod';

export const PersonalityModeEnum = z.enum(['tapori', 'balanced', 'professional', 'developer', 'academic']);
export const TaskPriorityEnum = z.enum(['low', 'medium', 'high', 'urgent']);
export const TaskStatusEnum = z.enum(['pending', 'in_progress', 'completed', 'cancelled']);

// Auth Schemas
export const SignupRequestSchema = z.object({
  email: z.string().trim().email('Valid email required').max(254, 'Email too long'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72, 'Password must be at most 72 characters'),
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  username: z.string().trim().min(3, 'Username must be at least 3 characters').max(40, 'Username too long').regex(/^[a-zA-Z0-9_]+$/, 'Alphanumeric and underscores only')
});

export const LoginRequestSchema = z.object({
  email: z.string().trim().email('Valid email required').max(254, 'Email too long'),
  password: z.string().min(1, 'Password is required').max(72, 'Password too long')
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required').max(72),
  newPassword: z.string().min(8, 'New password must be at least 8 characters').max(72, 'New password must be at most 72 characters')
});

export const GoogleAuthRequestSchema = z.object({
  idToken: z.string().min(10, 'Google ID token required').max(4096)
});

// User Preferences Schema
export const UpdatePreferencesSchema = z.object({
  theme: z.enum(['dark', 'light', 'system']).optional(),
  language: z.enum(['hinglish', 'hindi', 'english']).optional(),
  defaultPersonalityMode: PersonalityModeEnum.optional(),
  voiceSpeed: z.number().min(0.5).max(2.0).optional(),
  voiceGender: z.enum(['male', 'female']).optional(),
  soundEffectsEnabled: z.boolean().optional(),
  proactiveBriefingEnabled: z.boolean().optional()
});

// Learning & Consent Schemas
export const UpdateConsentSchema = z.object({
  personalMemoryEnabled: z.boolean().optional(),
  crossUserTrainingOptIn: z.boolean().optional(),
  allowAnalytics: z.boolean().optional()
});

// Chat Schemas
export const CreateConversationSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  personalityMode: PersonalityModeEnum.default('tapori'),
  modelId: z.string().trim().min(1).max(64).default('bhai')
});

export const SendMessageRequestSchema = z.object({
  conversationId: z.string().trim().min(1, 'Conversation ID required').max(128),
  content: z.string().trim().min(1, 'Message content cannot be empty').max(16000, 'Message exceeds 16000 characters'),
  personalityMode: PersonalityModeEnum.optional(),
  modelId: z.string().trim().max(64).optional(),
  attachmentIds: z.array(z.string().max(128)).max(10).optional()
});

export const MessageFeedbackSchema = z.object({
  messageId: z.string().trim().min(1).max(128),
  rating: z.enum(['up', 'down']),
  reason: z.enum(['inaccurate', 'unhelpful', 'out_of_character', 'hallucination', 'other']).optional(),
  correctionText: z.string().max(1000).optional()
});

// Task Schemas
export const CreateTaskSchema = z.object({
  title: z.string().trim().min(1, 'Task title required').max(200),
  description: z.string().max(2000).optional(),
  priority: TaskPriorityEnum.default('medium'),
  dueDate: z.string().max(40).optional(), // ISO string
  subtasks: z.array(z.object({
    id: z.string().max(128),
    title: z.string().max(200),
    completed: z.boolean()
  })).max(50).optional(),
  tags: z.array(z.string().max(64)).max(20).optional(),
  recurring: z.enum(['none', 'daily', 'weekly', 'monthly']).optional()
});

export const UpdateTaskSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  priority: TaskPriorityEnum.optional(),
  status: TaskStatusEnum.optional(),
  dueDate: z.string().max(40).nullable().optional(),
  subtasks: z.array(z.object({
    id: z.string().max(128),
    title: z.string().max(200),
    completed: z.boolean()
  })).max(50).optional(),
  tags: z.array(z.string().max(64)).max(20).optional(),
  recurring: z.enum(['none', 'daily', 'weekly', 'monthly']).optional()
});

// Reminder Schemas
export const CreateReminderSchema = z.object({
  title: z.string().trim().min(1, 'Reminder title required').max(200),
  scheduledTime: z.string().datetime({ message: 'Valid ISO datetime required' }),
  timezone: z.string().trim().min(1).max(64).default('Asia/Kolkata'),
  recurring: z.enum(['none', 'daily', 'weekly', 'monthly']).optional(),
  channel: z.enum(['in_app', 'push', 'both']).default('in_app')
});

// Calendar Event Schema
export const CreateCalendarEventSchema = z.object({
  title: z.string().trim().min(1, 'Event title required').max(200),
  startTime: z.string().datetime({ message: 'Valid ISO startTime required' }),
  endTime: z.string().datetime({ message: 'Valid ISO endTime required' }),
  description: z.string().max(2000).optional(),
  location: z.string().max(300).optional()
});

// Personal Memory Schemas
export const CreateMemorySchema = z.object({
  key: z.string().trim().min(1, 'Memory key required').max(100),
  category: z.enum(['preference', 'fact', 'project', 'goal', 'instruction']),
  content: z.string().trim().min(1, 'Content required').max(5000),
  confidence: z.number().min(0).max(1).default(1.0),
  sourceConversationId: z.string().max(128).optional()
});

export const UpdateMemorySchema = z.object({
  key: z.string().trim().min(1).max(100).optional(),
  category: z.enum(['preference', 'fact', 'project', 'goal', 'instruction']).optional(),
  content: z.string().trim().min(1).max(5000).optional(),
  confidence: z.number().min(0).max(1).optional()
});

// Knowledge Base Schemas
export const UploadKnowledgeDocSchema = z.object({
  filename: z
    .string()
    .trim()
    .min(1, 'Filename required')
    .max(120, 'Filename too long')
    .regex(/^[a-zA-Z0-9._ -]+$/, 'Filename contains unsupported characters')
    .refine(val => !val.includes('..'), 'Invalid path sequence in filename')
    .refine(
      val => /\.(txt|md|markdown|csv|json|log)$/i.test(val),
      'Only .txt, .md, .csv, .json, and .log files are permitted'
    ),
  rawText: z.string().min(1, 'Document text required').max(500_000, 'Document exceeds 500KB limit'),
  mimeType: z
    .enum(['text/plain', 'text/markdown', 'text/csv', 'application/json'])
    .default('text/plain')
});

export const QueryKnowledgeSchema = z.object({
  query: z.string().trim().min(1, 'Search query required').max(1000),
  topK: z.number().int().min(1).max(20).default(3)
});

// Agentic Planning & Tool Approval Schemas
export const CreateAgentPlanSchema = z.object({
  goal: z.string().trim().min(1, 'Goal is required').max(2000),
  conversationId: z.string().trim().min(1).max(128).optional()
});

export const ToolApprovalSchema = z.object({
  planId: z.string().trim().min(1).max(128),
  stepIndex: z.number().int().min(0).max(50),
  approved: z.boolean(),
  modifiedParameters: z.record(z.unknown()).optional()
});

// ElevenLabs Voice Synthesis Schema
export const SynthesizeVoiceSchema = z.object({
  text: z.string().trim().min(1, 'Text to synthesize is required.').max(5000, 'Text exceeds 5000 character limit'),
  voiceId: z.string().regex(/^[a-zA-Z0-9_-]{4,64}$/, 'Invalid voiceId format').optional(),
  modelId: z.string().regex(/^[a-zA-Z0-9._-]{4,64}$/, 'Invalid modelId format').optional(),
  voiceSettings: z
    .object({
      stability: z.number().min(0).max(1).optional(),
      similarity_boost: z.number().min(0).max(1).optional(),
      style: z.number().min(0).max(1).optional(),
      use_speaker_boost: z.boolean().optional()
    })
    .optional()
});
