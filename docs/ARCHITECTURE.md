# BANTAI — Production System Architecture
> **Apna Model. Apna Dimaag. Apna AI.**

## 1. Architectural Philosophy
BANTAI is a local-first, hardware-aware, self-hosted agentic AI workbench for private reasoning, coding, and bilingual productivity. It eliminates dependence on third-party hosted LLM inference APIs (no OpenAI, Anthropic, Gemini, Groq, or OpenRouter). Core conversational intelligence, hybrid retrieval, autonomous tool execution, and QLoRA fine-tuning operate under strict local boundaries.

```text
+-----------------------------------------------------------------------------------+
|                                BANTAI CLIENTS                                     |
|                                                                                   |
|  [ Web Console: Next.js 14 App Router ]       [ Mobile Client: React Native APK ] |
|  - Port 3001 (Obsidian #07070f UI)            - Expo ~51 / Android (ai.bantai.app)|
|  - 64px Nav Rail + 48px Telemetry Top Bar     - Auth, Chat (Chhotu/Bhai), Tasks,  |
|  - 5 Views: Chat, Agent, Memory, FineTune,      Settings bottom-tab navigation    |
|    Settings                                                                       |
|  - SSE Token Streaming & Voice (STT / TTS)    - Expo SecureStore + Backend REST |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                        BACKEND API LAYER (Express, Port 4000)                     |
|                                                                                   |
|  - Helmet Security Headers + Strict CORS Allowlist + Global/Auth/Voice Rate Limits|
|  - JWT Authentication (HS256 allowlist) & Input Validation (Zod Schemas)          |
|  - SSE Chat Streaming (/api/chat/stream) + ElevenLabs Voice Proxy (/api/voice)    |
+-----------------------------------------------------------------------------------+
       |                            |                                   |
       v                            v                                   v
+--------------------+     +--------------------+     +-----------------------------+
| DUAL-DB AIR-GAP    |     | AGENTIC ENGINE     |     | SELF-HOSTED AI ENGINE       |
|                    |     |                    |     |                             |
| [MongoUserService] |     | [AgentPlanner]     |     | [InferenceService]          |
| - User Identity &  |     | - Goal Decomposer  |     | 1. Ollama (bantai-bhai,     |
|   Consent ONLY     |     | - Human-in-Loop    |     |    bantai-chhotu)           |
| - Defensive Guard  |     |   Approval Gate    |     | 2. llama.cpp server         |
|   blocks messages  |     |                    |     | 3. Deterministic Offline    |
|                    |     | [ToolRegistry: 10] |     |    Local Dialogue Engine    |
| [FirebaseService]  |     | - Calculator       |     |                             |
| - Live Firestore   |     | - Doc Reader / RAG |     | [RagService & Memory]       |
|   OR local JSON    |     | - File Search      |     | - Hybrid BM25+256-d cosine  |
|   isolated store   |     | - Sandbox VM*      |     | - Bounded PDF (unpdf) RAG   |
| - Conversations,   |     | - Tasks/Reminders/ |     | - User-isolated facts       |
|   Messages, Tasks, |     |   Calendar (.ics)/ |     |                             |
|   Memories, RAG    |     |   Email (.eml/SMTP)|     | [QLoRA Fine-Tuning]         |
+--------------------+     +--------------------+     | - PyTorch + PEFT 4-bit NF4  |
                                                      |   on RTX A2000 (4GB VRAM)   |
                                                      +-----------------------------+
```

---

## 2. Strict Data Separation Policy
Data is partitioned across structural boundaries enforced at both schema and service layers:
- **User Identity Partition (`MongoUserService`)**: Stores `userId` (UUID v4), `email`, `name`, `username`, bcrypt password hash, `preferences`, and `learningConsent`. Includes a runtime defensive assertion (`assertNoConversationData`) that throws a security violation error if conversation keys (`messages`, `conversation`, `transcript`, `chatHistory`, `aiResponse`) are passed.
- **Application & Telemetry Partition (`FirebaseFirestoreService`)**: Stores conversations, messages, tasks, reminders, personal memories, calendar events, email drafts, and knowledge document records scoped by `userId`. Connects to live Cloud Firestore via Firebase Admin SDK when credentials are placed in gitignored `security/`, or falls back transparently to user-isolated local JSON storage (`backend/data/firestore_store/`). Private client security rules reside in gitignored `security/`.

---

## 3. Core Systems & Modules
1. **Conversational AI (`inference.service.ts`, `chat.controller.ts`)**: Multi-turn SSE streaming supporting `Balanced`, `Professional`, `Developer`, and `Academic` modes defined in `@bantai/shared`, personal memory & top-K RAG chunk injection, and deterministic offline fallback.
2. **Personal Assistant & Agentic Engine (`planner.service.ts`, `tool_registry.service.ts`)**: Multi-step goal decomposition across 10 registered tools (`calculator`, `document_reader`, `file_search`, `database_retrieval`, `rag_retrieval`, `sandbox_code_executor`, `task_manager`, `reminder_scheduler`, `calendar_connector`, `email_connector`), enforcing human authorization gates on sensitive operations.
3. **Personal Memory & RAG (`memory.service.ts`, `rag.service.ts`)**: Automatic extraction of user preference/project statements (`personalMemoryEnabled`), explicit CRUD management via `/api/assistant/memory`, PDF (`unpdf`) + text ingestion, and Hybrid BM25 + 256-dimensional cosine similarity search (`./data/rag_vectors.json`).
4. **Voice Engine (`voiceEngine.ts`, `elevenlabs.service.ts`)**: Browser Web Speech STT (`en-IN` for Balanced, `en-US` otherwise), Chromium chunked Web Speech TTS fallback, and optional server-proxied ElevenLabs neural voice synthesis (`/api/voice/elevenlabs/*`).
5. **Continuous Learning & QLoRA (`learning.service.ts`, `train_lora_real.py`)**: Strict opt-in consent (`crossUserTrainingOptIn: false` by default), automated PII scrubbing (API tokens, emails, phones), 80/10/10 split export, and real 4-bit NF4 LoRA fine-tuning producing `.safetensors` adapters (`models/adapters/bantai_v1/`).
