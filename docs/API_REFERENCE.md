# BANTAI — Comprehensive REST API Reference

**Base URL:** `http://localhost:4000/api`

All protected endpoints require header:
`Authorization: Bearer <JWT_TOKEN>` (`HS256`-signed token)

Rate limiting is enforced globally across `/api` (`200 req/min` per IP), with stricter limits on `/api/auth/*` (`10 req/15 min`) and `/api/voice/elevenlabs/tts` (`30 req/min`).

---

## 0. System Health & Status

### `GET /` (Root, unprefixed)
Returns API operational banner, Web UI URL (`http://localhost:3001`), and health check URL.

### `GET /api/health`
Probes active local inference backend status (`ollama`, `llamacpp`, or `local_engine`) and returns online metadata + available local models.

---

## 1. Authentication & Profile Endpoints (`/api/auth`)

### `POST /api/auth/signup` *(Rate limited)*
Creates user record in `MongoUserService` (`mongo_users_store.json`). Strictly user profile only.
- **Body (Zod `SignupRequestSchema`):** `{ "email": "string", "password": "min-8-chars", "name": "min-2-chars", "username": "alphanumeric_only" }`
- **Response (`201`):** `{ "success": true, "data": { "user": SafeUserProfile, "token": "jwt-token" } }`

### `POST /api/auth/login` *(Rate limited)*
- **Body (`LoginRequestSchema`):** `{ "email": "string", "password": "string" }`
- **Response (`200`):** `{ "success": true, "data": { "user": SafeUserProfile, "token": "jwt-token" } }`

### `POST /api/auth/google` *(Rate limited)*
- **Body (`GoogleAuthRequestSchema`):** `{ "idToken": "string" }`
- **Behavior:** Returns `501 Not Implemented` in `production` or whenever `GOOGLE_CLIENT_ID` is unset (`SEC-006`). Development simulation only triggers when explicitly enabled with `GOOGLE_CLIENT_ID` outside production.

### `POST /api/auth/logout`
Returns `{ "success": true, "message": "Successfully logged out" }`.

### `GET /api/auth/me` *(Auth required)*
Returns `SafeUserProfile` (password hash omitted).

### `PATCH /api/auth/preferences` *(Auth required)*
Updates user preferences (`theme`, `language`, `defaultPersonalityMode`, `voiceSpeed`, `voiceGender`, `soundEffectsEnabled`, `proactiveBriefingEnabled`).

### `PATCH /api/auth/consent` *(Auth required)*
Updates `personalMemoryEnabled`, `crossUserTrainingOptIn`, and `allowAnalytics` with immutable audit timestamps.

---

## 2. Chat & Conversational AI Endpoints (`/api/chat`, *Auth required*)

### `POST /api/chat/conversations`
- **Body (`CreateConversationSchema`):** `{ "title"?: "string", "personalityMode"?: "tapori|balanced|professional|developer|academic", "modelId"?: "bhai|chhotu" }`

### `GET /api/chat/conversations`
Lists non-archived conversations sorted by `lastMessageAt` descending for the authenticated user.

### `GET /api/chat/conversations/:id/messages`
Retrieves ordered message history for the conversation after ownership verification.

### `DELETE /api/chat/conversations/:id`
Deletes conversation and its message history.

### `POST /api/chat/feedback`
- **Body (`MessageFeedbackSchema`):** `{ "messageId": "string", "rating": "up|down", "reason"?: "string", "correctionText"?: "string" }`

### `POST /api/chat/stream`
Server-Sent Events (`text/event-stream`) endpoint. Saves user message, runs background memory extraction, injects identity + personal memory + top-2 RAG chunks, streams model output, persists assistant response, and auto-titles early conversations.
- **Body (`SendMessageRequestSchema`):** `{ "conversationId": "string", "content": "string", "personalityMode"?: "...", "modelId"?: "...", "attachmentIds"?: ["string"] }`
- **Stream Chunks:** `data: {"type":"token","content":"..."}\n\n`, terminating with `{"type":"done","finishReason":"stop"}` or `{"type":"error","error":"..."}`.

---

## 3. Personal Assistant, Memory, RAG & Agent Endpoints (`/api/assistant`, *Auth required*)

### Tasks
- `GET /api/assistant/tasks`
- `POST /api/assistant/tasks` — `{ "title": "string", "description"?: "string", "priority"?: "low|medium|high|urgent", "dueDate"?: "ISO", "subtasks"?: [...], "tags"?: [...], "recurring"?: "none|daily|weekly|monthly" }`
- `PATCH /api/assistant/tasks/:id`
- `DELETE /api/assistant/tasks/:id`

### Reminders
- `GET /api/assistant/reminders`
- `POST /api/assistant/reminders` — `{ "title": "string", "scheduledTime": "ISO-datetime", "timezone"?: "Asia/Kolkata", "recurring"?: "...", "channel"?: "in_app|push|both" }`
- `DELETE /api/assistant/reminders/:id`

### Calendar
- `GET /api/assistant/calendar`
- `POST /api/assistant/calendar` — `{ "title": "string", "startTime": "ISO", "endTime": "ISO", "description"?: "string", "location"?: "string" }`

### Personal Memory
- `GET /api/assistant/memory`
- `POST /api/assistant/memory` — `{ "key": "string", "category": "preference|fact|project|goal|instruction", "content": "string", "confidence"?: 0..1 }`
- `PATCH /api/assistant/memory/:id`
- `DELETE /api/assistant/memory/:id`
- `DELETE /api/assistant/memory-clear-all`

### Knowledge Base & RAG
- `GET /api/assistant/knowledge/docs`
- `POST /api/assistant/knowledge/upload` — `{ "filename": "string", "rawText": "string", "mimeType"?: "string" }`
- `POST /api/assistant/knowledge/query` — `{ "query": "string", "topK"?: 3 }`

### Agentic Execution
- `POST /api/assistant/agent/plan` — `{ "goal": "string", "conversationId"?: "string" }`
- `POST /api/assistant/agent/execute/:planId`
- `POST /api/assistant/agent/approve-step` — `{ "planId": "string", "stepIndex": 0, "approved": true }`

---

## 4. Learning, Models & Data Governance Endpoints (`/api/learning`, *Auth required*)

### `GET /api/learning/status`
Returns user consent flags (`crossUserTrainingOptIn`, `personalMemoryEnabled`, `consentTimestamp`, `policyVersion`) and live inference backend status.

### `GET /api/learning/models`
Returns active inference backend telemetry plus `SUPPORTED_MODELS` metadata.

### `POST /api/learning/export-dataset` *(Admin role required)*
Filters approved examples (`qualityScore >= 0.7`), shuffles into 80/10/10 train/val/test JSONL splits, writes `manifest.json`, and returns the manifest.

### `POST /api/learning/wipe-data`
Irreversibly erases all user records across both `FirebaseFirestoreService` and `MongoUserService`.

---

## 5. Voice Synthesis Endpoints (`/api/voice`, *Auth required*)

### `GET /api/voice/elevenlabs/voices`
Fetches voices from ElevenLabs API if an API key is provided (`x-elevenlabs-key` header, `apiKey` query param, or `ELEVENLABS_API_KEY` env var); otherwise falls back to the built-in 9-voice catalog (`Adam`, `Bella`, `Matilda`, `Antoni`, `George`, `Arnold`, `Callum`, `Charlie`, `Liam`).

### `POST /api/voice/elevenlabs/tts` *(Voice rate limited: 30 req/min)*
Synthesizes `audio/mpeg` speech via ElevenLabs `eleven_multilingual_v2`.
- **Body:** `{ "text": "string", "voiceId"?: "string", "modelId"?: "string", "voiceSettings"?: {...}, "apiKey"?: "string" }`
