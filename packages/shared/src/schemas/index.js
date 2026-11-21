"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolApprovalSchema = exports.UpdateMemorySchema = exports.CreateMemorySchema = exports.CreateReminderSchema = exports.UpdateTaskSchema = exports.CreateTaskSchema = exports.MessageFeedbackSchema = exports.SendMessageRequestSchema = exports.CreateConversationSchema = exports.UpdateConsentSchema = exports.UpdatePreferencesSchema = exports.GoogleAuthRequestSchema = exports.LoginRequestSchema = exports.SignupRequestSchema = exports.TaskStatusEnum = exports.TaskPriorityEnum = exports.PersonalityModeEnum = void 0;
const zod_1 = require("zod");
exports.PersonalityModeEnum = zod_1.z.enum(['tapori', 'balanced', 'professional', 'developer', 'academic']);
exports.TaskPriorityEnum = zod_1.z.enum(['low', 'medium', 'high', 'urgent']);
exports.TaskStatusEnum = zod_1.z.enum(['pending', 'in_progress', 'completed', 'cancelled']);
// Auth Schemas
exports.SignupRequestSchema = zod_1.z.object({
    email: zod_1.z.string().email('Valid email required'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
    name: zod_1.z.string().min(2, 'Name must be at least 2 characters'),
    username: zod_1.z.string().min(3, 'Username must be at least 3 characters').regex(/^[a-zA-Z0-9_]+$/, 'Alphanumeric and underscores only')
});
exports.LoginRequestSchema = zod_1.z.object({
    email: zod_1.z.string().email('Valid email required'),
    password: zod_1.z.string().min(1, 'Password is required')
});
exports.GoogleAuthRequestSchema = zod_1.z.object({
    idToken: zod_1.z.string().min(10, 'Google ID token required')
});
// User Preferences Schema
exports.UpdatePreferencesSchema = zod_1.z.object({
    theme: zod_1.z.enum(['dark', 'light', 'system']).optional(),
    language: zod_1.z.enum(['hinglish', 'hindi', 'english']).optional(),
    defaultPersonalityMode: exports.PersonalityModeEnum.optional(),
    voiceSpeed: zod_1.z.number().min(0.5).max(2.0).optional(),
    voiceGender: zod_1.z.enum(['male', 'female']).optional(),
    soundEffectsEnabled: zod_1.z.boolean().optional(),
    proactiveBriefingEnabled: zod_1.z.boolean().optional()
});
// Learning & Consent Schemas
exports.UpdateConsentSchema = zod_1.z.object({
    personalMemoryEnabled: zod_1.z.boolean().optional(),
    crossUserTrainingOptIn: zod_1.z.boolean().optional(),
    allowAnalytics: zod_1.z.boolean().optional()
});
// Chat Schemas
exports.CreateConversationSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(100).optional(),
    personalityMode: exports.PersonalityModeEnum.default('tapori'),
    modelId: zod_1.z.string().default('qwen2.5:7b')
});
exports.SendMessageRequestSchema = zod_1.z.object({
    conversationId: zod_1.z.string().min(1, 'Conversation ID required'),
    content: zod_1.z.string().min(1, 'Message content cannot be empty'),
    personalityMode: exports.PersonalityModeEnum.optional(),
    modelId: zod_1.z.string().optional(),
    attachmentIds: zod_1.z.array(zod_1.z.string()).optional()
});
exports.MessageFeedbackSchema = zod_1.z.object({
    messageId: zod_1.z.string().min(1),
    rating: zod_1.z.enum(['up', 'down']),
    reason: zod_1.z.enum(['inaccurate', 'unhelpful', 'out_of_character', 'hallucination', 'other']).optional(),
    correctionText: zod_1.z.string().max(1000).optional()
});
// Task Schemas
exports.CreateTaskSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, 'Task title required'),
    description: zod_1.z.string().optional(),
    priority: exports.TaskPriorityEnum.default('medium'),
    dueDate: zod_1.z.string().optional(), // ISO string
    subtasks: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        title: zod_1.z.string(),
        completed: zod_1.z.boolean()
    })).optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    recurring: zod_1.z.enum(['none', 'daily', 'weekly', 'monthly']).optional()
});
exports.UpdateTaskSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).optional(),
    description: zod_1.z.string().optional(),
    priority: exports.TaskPriorityEnum.optional(),
    status: exports.TaskStatusEnum.optional(),
    dueDate: zod_1.z.string().nullable().optional(),
    subtasks: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        title: zod_1.z.string(),
        completed: zod_1.z.boolean()
    })).optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    recurring: zod_1.z.enum(['none', 'daily', 'weekly', 'monthly']).optional()
});
// Reminder Schemas
exports.CreateReminderSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, 'Reminder title required'),
    scheduledTime: zod_1.z.string().datetime({ message: 'Valid ISO datetime required' }),
    timezone: zod_1.z.string().default('Asia/Kolkata'),
    recurring: zod_1.z.enum(['none', 'daily', 'weekly', 'monthly']).optional(),
    channel: zod_1.z.enum(['in_app', 'push', 'both']).default('in_app')
});
// Personal Memory Schemas
exports.CreateMemorySchema = zod_1.z.object({
    key: zod_1.z.string().min(1, 'Memory key required'),
    category: zod_1.z.enum(['preference', 'fact', 'project', 'goal', 'instruction']),
    content: zod_1.z.string().min(1, 'Content required'),
    confidence: zod_1.z.number().min(0).max(1).default(1.0),
    sourceConversationId: zod_1.z.string().optional()
});
exports.UpdateMemorySchema = zod_1.z.object({
    key: zod_1.z.string().min(1).optional(),
    category: zod_1.z.enum(['preference', 'fact', 'project', 'goal', 'instruction']).optional(),
    content: zod_1.z.string().min(1).optional(),
    confidence: zod_1.z.number().min(0).max(1).optional()
});
// Tool Call Approval Schema
exports.ToolApprovalSchema = zod_1.z.object({
    planId: zod_1.z.string().min(1),
    stepIndex: zod_1.z.number().int().min(0),
    approved: zod_1.z.boolean(),
    modifiedParameters: zod_1.z.record(zod_1.z.unknown()).optional()
});
