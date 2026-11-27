# BANTAI — Database Architecture & Data Separation Specification

## 1. Overview
BANTAI enforces a strict dual-database air-gap architecture partitioning User Identity (`MongoUserService`) from Conversations, Assistant Telemetry, and RAG Vectors (`FirebaseFirestoreService` + `RagService`).

---

## 2. MongoDB User Partition (`MongoUserService`) — Identity ONLY
Implemented in `backend/src/services/database/mongo.service.ts`.
**CRITICAL INVARIANT:** Storing conversation messages, prompts, or AI transcripts in the MongoDB user store is forbidden and blocked by `assertNoConversationData()` (checks keys `messages`, `conversation`, `transcript`, `chatHistory`, `aiResponse` and throws a security violation).

- **Local Persistence:** Persists JSON user records at `./data/mongo_users_store.json` (ready for drop-in MongoDB driver replacement via `MONGODB_URI`).
- **Safe Profile Projection:** `passwordHash` is stripped before returning `SafeUserProfile`.

### Schema: `MongoUser`
```json
{
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
    "defaultPersonalityMode": "balanced",
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
  "createdAt": "2026-11-22T12:00:00.000Z",
  "updatedAt": "2026-11-22T12:00:00.000Z",
  "lastLoginAt": "2026-11-22T12:00:00.000Z",
  "oauthProvider": "local",
  "oauthId": null
}
```

---

## 3. Firebase Cloud Firestore Partition (`FirebaseFirestoreService`)

Implemented in `backend/src/services/database/firebase.service.ts` with private CEL security rules kept inside gitignored `security/` (`firestore.rules`, 520 lines).

- **Dual-Mode Storage:**
  1. **Live Cloud Firestore:** Activates automatically when `serviceAccountKey.json` (in gitignored `security/` or root), `GOOGLE_APPLICATION_CREDENTIALS`, or `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` are detected via `firebase-admin`.
  2. **Local User-Isolated Store:** Automatically persists collections to `./data/firestore_store/*.json` (`backend/data/firestore_store/` when running backend) when cloud credentials are not configured (`conversations.json`, `messages.json`, `tasks.json`, `reminders.json`, `memories.json`, `calendar.json`, `emails.json`, `knowledge.json`).

### Collections & Ownership Rules
Every document carries an immutable `userId` field verified in the local `security/` Firestore rules (`request.auth != null && request.auth.uid == userId`), with strict field whitelists (`hasOnly`), string/array bounds, and default-deny wildcard root matching.

1. **`conversations`** (`/conversations/{conversationId}`)
   - Fields: `id`, `userId`, `title`, `personalityMode`, `modelId`, `messageCount`, `isArchived`, `isPinned`, `createdAt`, `updatedAt`, `lastMessageAt`, optional `tags`, `summary`.
2. **`messages`** (`/messages/{messageId}` and rule support for `/conversations/{conversationId}/messages/{messageId}`)
   - Fields: `id`, `conversationId`, `userId`, `role` (`user|assistant|system|tool`), `content`, `personalityMode`, `createdAt`, optional `modelUsed`, `toolCalls`, `attachments`, `feedback`, `tokensPrompt`, `tokensCompletion`, `totalTokens`.
3. **`tasks`** (`/tasks/{taskId}`)
   - Fields: `id`, `userId`, `title`, `priority` (`low|medium|high|urgent`), `status` (`pending|in_progress|completed|cancelled`), `createdAt`, `updatedAt`, optional `description`, `dueDate`, `subtasks`, `tags`, `recurring`, `completedAt`.
4. **`reminders`** (`/reminders/{reminderId}`)
   - Fields: `id`, `userId`, `title`, `scheduledTime`, `timezone`, `status` (`scheduled|fired|dismissed|cancelled`), `channel` (`in_app|push|both`), `createdAt`, optional `recurring`, `isTriggered` (required in CEL rules for direct client writes).
5. **`memories`** (`/memories/{memoryId}`)
   - Fields: `id`, `userId`, `key`, `category` (`preference|fact|project|goal|instruction`), `content`, `confidence`, `createdAt`, `updatedAt`, optional `sourceConversationId`.
6. **`calendar`** (`/calendar/{eventId}`)
   - Fields: `id`, `userId`, `title`, `startTime`, `endTime`, `location`, `description`, `createdAt`, optional `updatedAt`, `attendees`, `isAllDay`, `hasConflict`.
7. **`knowledge`** (`/knowledge/{docId}`)
   - Fields: `id`, `userId`, `filename`, `originalName`, `mimeType`, `sizeBytes`, `storageUrl`, `chunkCount`, `embeddingModel`, `summary`, `createdAt`, optional `chunks`, `extractedKeywords`.
8. **Local Email Drafts** (`emails.json` in local store for `email_connector` tool)
   - Fields: `id`, `userId`, `to`, `subject`, `body`, `status` (`draft|pending_approval|approved|sent|cancelled`), `createdAt`, `updatedAt`.

---

## 4. Vector & Training Data Files (`./data/`)
- **`./data/vector_chunks_store.json`**: Per-user 384-d embeddings managed by `RagService`.
- **`./data/learning_datasets/approved_examples_buffer.jsonl`**: PII-scrubbed feedback pairs collected strictly when `crossUserTrainingOptIn === true`.
- **`./data/learning_datasets/<version>/`**: Exported 80/10/10 `train.jsonl`, `val.jsonl`, `test.jsonl`, and `manifest.json`.
