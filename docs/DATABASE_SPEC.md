# BANTAI — Database Architecture & Data Separation Specification

## 1. Overview
BANTAI implements a strict dual-database architecture separating Identity (MongoDB) from Conversations & Assistant Records (Firebase).

---

## 2. MongoDB Schema — User Information ONLY
MongoDB is exclusively responsible for user account and profile information.
**CRITICAL RULE:** It is strictly forbidden to store conversation messages, AI responses, or chat transcripts in MongoDB.

### Collection: `users`
```json
{
  "_id": "ObjectId",
  "userId": "uuid-v4-string",
  "email": "user@example.com",
  "name": "Bantai User",
  "username": "bantaiuser",
  "passwordHash": "$2a$10$...",
  "avatarUrl": "https://...",
  "role": "user",
  "status": "active",
  "preferences": {
    "theme": "dark",
    "language": "hinglish",
    "defaultPersonalityMode": "tapori",
    "voiceSpeed": 1.0,
    "voiceGender": "male",
    "soundEffectsEnabled": true,
    "proactiveBriefingEnabled": true
  },
  "learningConsent": {
    "personalMemoryEnabled": true,
    "crossUserTrainingOptIn": false,
    "consentTimestamp": null,
    "policyVersion": "1.0.0-2026",
    "allowAnalytics": false,
    "withdrawnAt": null
  },
  "subscriptionPlan": "free",
  "createdAt": "2026-11-21T12:00:00.000Z",
  "updatedAt": "2026-11-21T12:00:00.000Z",
  "lastLoginAt": "2026-11-21T12:00:00.000Z",
  "oauthProvider": "local",
  "oauthId": null
}
```

---

## 3. Firebase Cloud Firestore Schema
All conversational, assistant, memory, and application records reside in Firestore with user-level partition security.

### Collection: `conversations`
Path: `users/{userId}/conversations/{conversationId}`
```json
{
  "id": "uuid-v4-string",
  "userId": "uuid-v4-string",
  "title": "QuickSort Algorithm in Mumbai Style",
  "personalityMode": "tapori",
  "modelId": "qwen2.5:7b",
  "messageCount": 4,
  "isArchived": false,
  "isPinned": false,
  "createdAt": "2026-11-21T12:00:00.000Z",
  "updatedAt": "2026-11-21T12:05:00.000Z",
  "lastMessageAt": "2026-11-21T12:05:00.000Z"
}
```

### Collection: `messages`
Path: `users/{userId}/conversations/{conversationId}/messages/{messageId}`
```json
{
  "id": "uuid-v4-string",
  "conversationId": "uuid-v4-string",
  "userId": "uuid-v4-string",
  "role": "assistant",
  "content": "Arey bhidu! QuickSort algorithm bole toh...",
  "personalityMode": "tapori",
  "modelUsed": "qwen2.5:7b",
  "feedback": {
    "rating": "up",
    "correctionText": null,
    "submittedAt": "2026-11-21T12:06:00.000Z"
  },
  "createdAt": "2026-11-21T12:05:00.000Z"
}
```

### Collection: `tasks`
Path: `users/{userId}/tasks/{taskId}`
```json
{
  "id": "uuid-v4-string",
  "userId": "uuid-v4-string",
  "title": "Deploy BANTAI to Vercel",
  "priority": "high",
  "status": "pending",
  "dueDate": "2026-11-22T10:00:00.000Z",
  "createdAt": "2026-11-21T12:00:00.000Z",
  "updatedAt": "2026-11-21T12:00:00.000Z"
}
```

### Collection: `reminders`
Path: `users/{userId}/reminders/{reminderId}`
```json
{
  "id": "uuid-v4-string",
  "userId": "uuid-v4-string",
  "title": "Vercel Production Verification",
  "scheduledTime": "2026-11-22T10:00:00.000Z",
  "timezone": "Asia/Kolkata",
  "status": "scheduled",
  "channel": "in_app",
  "createdAt": "2026-11-21T12:00:00.000Z"
}
```

### Collection: `memories`
Path: `users/{userId}/memories/{memoryId}`
```json
{
  "id": "uuid-v4-string",
  "userId": "uuid-v4-string",
  "key": "pref_language",
  "category": "preference",
  "content": "User prefers TypeScript and React for fullstack development.",
  "confidence": 0.95,
  "createdAt": "2026-11-21T12:00:00.000Z",
  "updatedAt": "2026-11-21T12:00:00.000Z"
}
```

---

## 4. Firebase Storage
Stores user-uploaded documents (PDF, DOCX, XLSX, CSV, TXT, images) under:
`users/{userId}/uploads/{filename}`
Backed by private security rules requiring authenticated `request.auth.uid == userId`.
