# BANTAI — Comprehensive REST API Reference

Base URL: `http://localhost:4000/api`

All protected endpoints require HTTP header:
`Authorization: Bearer <JWT_TOKEN>`

---

## 1. Authentication Endpoints

### `POST /api/auth/signup`
Creates user record in MongoDB (User info only).
- **Body**: `{ "email": "string", "password": "min-8-chars", "name": "string", "username": "string" }`
- **Response**: `{ "success": true, "data": { "user": SafeUserProfile, "token": "jwt-token" } }`

### `POST /api/auth/login`
- **Body**: `{ "email": "string", "password": "string" }`
- **Response**: `{ "success": true, "data": { "user": SafeUserProfile, "token": "jwt-token" } }`

### `POST /api/auth/google`
- **Body**: `{ "idToken": "string" }`
- **Response**: `{ "success": true, "data": { "user": SafeUserProfile, "token": "jwt-token" } }`

### `GET /api/auth/me`
Returns current user profile.

### `PATCH /api/auth/preferences`
- **Body**: `{ "theme": "dark", "language": "hinglish", "defaultPersonalityMode": "tapori" }`

### `PATCH /api/auth/consent`
Updates personal memory and cross-user training opt-in consent.
- **Body**: `{ "personalMemoryEnabled": true, "crossUserTrainingOptIn": false }`

---

## 2. Chat & Conversational AI Endpoints

### `POST /api/chat/conversations`
Creates conversation in Firestore.
- **Body**: `{ "title": "string", "personalityMode": "tapori", "modelId": "qwen2.5:7b" }`

### `GET /api/chat/conversations`
Lists user's conversations.

### `GET /api/chat/conversations/:id/messages`
Retrieves conversation message history.

### `DELETE /api/chat/conversations/:id`
Deletes conversation and associated messages from Firestore.

### `POST /api/chat/stream`
Server-Sent Events (SSE) streaming endpoint.
- **Body**: `{ "conversationId": "id", "content": "user prompt", "personalityMode": "tapori", "modelId": "qwen2.5:7b" }`
- **Stream Output**: `data: {"type": "token", "content": "..."}\n\n`

---

## 3. Personal Assistant Endpoints

### `GET /api/assistant/tasks`
### `POST /api/assistant/tasks`
- **Body**: `{ "title": "string", "priority": "medium" }`
### `PATCH /api/assistant/tasks/:id`
### `DELETE /api/assistant/tasks/:id`

### `GET /api/assistant/reminders`
### `POST /api/assistant/reminders`
- **Body**: `{ "title": "string", "scheduledTime": "ISO-string", "timezone": "Asia/Kolkata" }`
### `DELETE /api/assistant/reminders/:id`

---

## 4. Personal Memory Endpoints

### `GET /api/assistant/memory`
Lists user's isolated semantic memories.
### `POST /api/assistant/memory`
- **Body**: `{ "key": "string", "category": "preference", "content": "string" }`
### `DELETE /api/assistant/memory/:id`
### `DELETE /api/assistant/memory-clear-all`

---

## 5. Knowledge Base (RAG) Endpoints

### `GET /api/assistant/knowledge/docs`
### `POST /api/assistant/knowledge/upload`
- **Body**: `{ "filename": "string", "rawText": "string" }`
### `POST /api/assistant/knowledge/query`
- **Body**: `{ "query": "string", "topK": 3 }`

---

## 6. Agentic Execution Endpoints

### `POST /api/assistant/agent/plan`
Generates multi-step plan from user goal.
- **Body**: `{ "goal": "string", "conversationId": "string" }`

### `POST /api/assistant/agent/execute/:planId`
Executes planned steps.

### `POST /api/assistant/agent/approve-step`
Human-in-the-loop authorization approval for sensitive tools.
- **Body**: `{ "planId": "string", "stepIndex": 0, "approved": true }`

---

## 7. Governance & System Endpoints

### `GET /api/learning/status`
Returns active model backend status and training consent configuration.

### `POST /api/learning/export-dataset`
Exports versioned train/val/test JSONL dataset splits (Admin only).

### `POST /api/learning/wipe-data`
Permanently and irreversibly erases all user records across MongoDB and Firebase.
