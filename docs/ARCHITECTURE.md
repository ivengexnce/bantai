# BANTAI — Production System Architecture
## Apna Model. Apna Dimaag. Apna AI.

### 1. Architectural Philosophy
BANTAI is designed from the ground up as a self-hosted, private, agentic AI platform. It completely eliminates dependence on third-party hosted AI inference APIs (no OpenAI, no Anthropic, no Gemini, no Groq, no OpenRouter).

```
+-----------------------------------------------------------------------------------+
|                                BANTAI CLIENTS                                     |
|                                                                                   |
|  [ Web Client: Next.js 14 App Router ]        [ Mobile Client: React Native APK ] |
|  - Desktop, Tablet, Mobile Web                - Android Native Installable APK    |
|  - SSE Streaming & Markdown / KaTeX           - Offline caching & sync            |
|  - Web Speech STT & Voice Playback            - Direct REST API communication     |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                            SHARED BACKEND API LAYER                               |
|                                                                                   |
|  - JWT Authentication & Refresh Token Rotation                                    |
|  - Input Validation (Zod Schemas)                                                 |
|  - Rate Limiting, CORS, & Session Security                                        |
|  - Streaming Server-Sent Events (SSE) Multiplexer                                 |
+-----------------------------------------------------------------------------------+
       |                            |                                   |
       v                            v                                   v
+---------------+          +------------------+          +--------------------------+
|   DATABASES   |          |  AGENTIC ENGINE  |          |   SELF-HOSTED AI ENGINE  |
|               |          |                  |          |                          |
| [MongoDB]     |          | [Planner]        |          | [Local Inference Bridge] |
| - User Info   |          | - Step Creator   |          | - Ollama (Qwen2.5 /      |
|   ONLY        |          | - Human-in-loop  |          |   Llama 3.1)             |
|               |          |   Gatekeeper     |          | - llama.cpp / vLLM       |
| [Firebase]    |          |                  |          | - Zero 3rd party APIs    |
| - Firestore:  |          | [Tool Registry]  |          |                          |
|   Chats,      |          | - Calculator     |          | [Local Vector Store]     |
|   Messages,   |          | - Doc Reader     |          | - 384-d Cosine Vectors   |
|   Tasks,      |          | - Sandbox VM     |          | - Private RAG Chunks     |
|   Reminders   |          | - Reminders      |          |                          |
| - Storage:    |          | - Tasks          |          | [Personal Memory]        |
|   Uploads     |          | - Email Connector|          | - User-isolated facts    |
+---------------+          +------------------+          +--------------------------+
```

### 2. Strict Data Separation Policy
To maximize privacy, scalability, and security, data is partitioned by strict structural boundaries:
- **MongoDB**: Strictly stores User Account & Profile Information. It is structurally prohibited from storing chat transcripts, AI responses, or message bodies.
- **Firebase Firestore**: Stores conversation documents, messages, feedback records, assistant tasks, reminders, and knowledge metadata.
- **Immutable User ID**: MongoDB and Firebase records share the identical immutable `userId` UUID.

### 3. Five Core Systems
1. **Conversational AI**: High-quality conversational intelligence supporting Mumbai Tapori, Balanced, Professional, Developer, and Academic modes.
2. **Personal AI Assistant**: Natural language task management, timezone-aware reminders, calendar conflict detection, and email drafting.
3. **Agentic Engine**: Goal decomposition, step execution, tool calling, and human-in-the-loop authorization gates.
4. **Personal Memory**: Semantic user preferences, facts, and project contexts stored in user-isolated partitions.
5. **Continuous Learning Engine**: Strict opt-in consent, PII scrubbing, versioned dataset curation, and PyTorch LoRA fine-tuning.
