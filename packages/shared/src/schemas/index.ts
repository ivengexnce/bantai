import { z } from 'zod';

export const PersonalityModeEnum = z.enum(['tapori', 'balanced', 'professional', 'developer', 'academic']);
export const TaskPriorityEnum = z.enum(['low', 'medium', 'high', 'urgent']);
export const TaskStatusEnum = z.enum(['pending', 'in_progress', 'completed', 'cancelled']);

// Auth Schemas
export const SignupRequestSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  username: z.string().min(3, 'Username must be at least 3 characters').regex(/^[a-zA-Z0-9_]+$/, 'Alphanumeric and underscores only')
});

export const LoginRequestSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(1, 'Password is required')
});

export const GoogleAuthRequestSchema = z.object({
  idToken: z.string().min(10, 'Google ID token required')
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
  title: z.string().min(1).max(100).optional(),
  personalityMode: PersonalityModeEnum.default('tapori'),
  modelId: z.string().default('bhai')
});

export const SendMessageRequestSchema = z.object({
  conversationId: z.string().min(1, 'Conversation ID required'),
  content: z.string().min(1, 'Message content cannot be empty'),
  personalityMode: PersonalityModeEnum.optional(),
  modelId: z.string().optional(),
  attachmentIds: z.array(z.string()).optional()
});

export const MessageFeedbackSchema = z.object({
  messageId: z.string().min(1),
  rating: z.enum(['up', 'down']),
  reason: z.enum(['inaccurate', 'unhelpful', 'out_of_character', 'hallucination', 'other']).optional(),
  correctionText: z.string().max(1000).optional()
});

// Task Schemas
export const CreateTaskSchema = z.object({
  title: z.string().min(1, 'Task title required'),
  description: z.string().optional(),
  priority: TaskPriorityEnum.default('medium'),
  dueDate: z.string().optional(), // ISO string
  subtasks: z.array(z.object({
    id: z.string(),
    title: z.string(),
    completed: z.boolean()
  })).optional(),
  tags: z.array(z.string()).optional(),
  recurring: z.enum(['none', 'daily', 'weekly', 'monthly']).optional()
});

export const UpdateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  priority: TaskPriorityEnum.optional(),
  status: TaskStatusEnum.optional(),
  dueDate: z.string().nullable().optional(),
  subtasks: z.array(z.object({
    id: z.string(),
    title: z.string(),
    completed: z.boolean()
  })).optional(),
  tags: z.array(z.string()).optional(),
  recurring: z.enum(['none', 'daily', 'weekly', 'monthly']).optional()
});

// Reminder Schemas
export const CreateReminderSchema = z.object({
  title: z.string().min(1, 'Reminder title required'),
  scheduledTime: z.string().datetime({ message: 'Valid ISO datetime required' }),
  timezone: z.string().default('Asia/Kolkata'),
  recurring: z.enum(['none', 'daily', 'weekly', 'monthly']).optional(),
  channel: z.enum(['in_app', 'push', 'both']).default('in_app')
});

// Personal Memory Schemas
export const CreateMemorySchema = z.object({
  key: z.string().min(1, 'Memory key required'),
  category: z.enum(['preference', 'fact', 'project', 'goal', 'instruction']),
  content: z.string().min(1, 'Content required'),
  confidence: z.number().min(0).max(1).default(1.0),
  sourceConversationId: z.string().optional()
});

export const UpdateMemorySchema = z.object({
  key: z.string().min(1).optional(),
  category: z.enum(['preference', 'fact', 'project', 'goal', 'instruction']).optional(),
  content: z.string().min(1).optional(),
  confidence: z.number().min(0).max(1).optional()
});

// Tool Call Approval Schema
export const ToolApprovalSchema = z.object({
  planId: z.string().min(1),
  stepIndex: z.number().int().min(0),
  approved: z.boolean(),
  modifiedParameters: z.record(z.unknown()).optional()
});
