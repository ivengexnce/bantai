# BANTAI

> **Apna Model. Apna Dimaag. Apna AI.**

Build status: 17/17 tests passing · License: Apache 2.0 · Platform: Web + Android · AI: 100% self-hosted · Personality: Mumbai Tapori

**BANTAI** is a production-grade, self-hosted agentic AI platform with an authentic Mumbai Tapori personality. It combines multi-turn conversational AI, a personal assistant, multi-step tool execution, persistent isolated memory, local vector RAG, and an opt-in LoRA fine-tuning pipeline — all running on infrastructure you own and control.

Zero OpenAI. Zero Anthropic. Zero Gemini. Seedha apna model.

---

## Table of Contents

- [Why BANTAI](#why-bantai)
- [Model Family](#model-family)
- [Core Systems](#core-systems)
- [Personality Modes](#personality-modes)
- [Database Architecture](#database-architecture)
- [Agentic Engine](#agentic-engine)
- [Quick Start](#quick-start)
- [Fine-Tuning Pipeline](#fine-tuning-pipeline)
- [Android APK](#android-apk)
- [Hardware Requirements](#hardware-requirements)
- [Testing](#testing)
- [Monorepo Structure](#monorepo-structure)
- [Contributing](#contributing)
- [Author](#author)
- [License](#license)

---

## Why BANTAI

Most AI assistants are either powerful or personal. BANTAI is built to be both.

**What makes it different:**

- **Fully sovereign.** No data leaves your infrastructure. Every inference call, every embedding, every model weight runs on hardware you control.
- **Actually agentic.** Not just chat. BANTAI plans multi-step tasks, selects the right tool, pauses for your approval on sensitive operations, and verifies results before reporting success.
- **Genuinely personalized.** Per-user isolated memory, RAG over your own documents, and an opt-in fine-tuning pipeline that improves the model on your approved data — not someone else's.
- **Honest about what it is.** No fake local engines, no hidden API calls, no hardcoded responses dressed up as AI. If inference is unavailable, BANTAI says so.
- **Mumbai mein bana, duniya ke liye.** A personality that makes technical work feel less like work.

---

## Model Family

BANTAI runs on a family of open-weight models under its own naming system. The underlying engine is Qwen 2.5, selectable by capability tier.

| Model | Icon | Color Code | Base Engine | Primary Use Case |
| :--- | :---: | :---: | :--- | :--- |
| **BANTAI Chhotu** | ⚡ | `#3B82F6` | Qwen 2.5 3B | Quick replies, mobile, CPU-only devices |
| **BANTAI Bhai** | 🤝 | `#10B981` | Qwen 2.5 7B | Daily use — **default for all users** |
| **BANTAI Ustad** | 🎯 | `#F59E0B` | Qwen 2.5 14B | Complex reasoning, coding, agentic tasks |
| **BANTAI Don** | 👑 | `#DC2626` | Qwen 2.5 32B | Maximum capability, heavy workloads |

**Taglines:**

- **Chhotu** — *Chhota packet, bada kaam.*
- **Bhai** — *Har kaam ke liye, har waqt ready.*
- **Ustad** — *Jab kaam serious ho, Ustad ko bulao.*
- **Don** — *Seedha Don level. No explanation needed.*

Users switch models from the chat header dropdown. The selection persists across sessions. The backend routes the display name to the correct Ollama model string via a single config map — swapping the underlying model never touches application code:

```json
{
  "chhotu": "qwen2.5:3b",
  "bhai":   "qwen2.5:7b",
  "ustad":  "qwen2.5:14b",
  "don":    "qwen2.5:32b"
}
```

---

## Core Systems

BANTAI is built around five integrated systems that share a single user identity and authorization model.

| System | Responsibility |
| --- | --- |
| **Conversational AI** | Multi-turn chat, SSE streaming, five switchable personality modes |
| **Personal Assistant** | Tasks, reminders, calendar, email assistant, voice interaction |
| **Agentic Engine** | Goal planner, step executor, ten tools, human authorization gate |
| **Personal Memory** | User-isolated semantic facts, preferences, and project context |
| **Hybrid Learning** | Opt-in feedback, PII scrubbing, versioned LoRA fine-tuning |

All five systems are forbidden from sharing data across user accounts. Every record in every system is associated with an immutable `userId` at write time and verified at read time server-side.

---

## Personality Modes

Switch instantly from the chat header or Settings. The selected mode persists across sessions.

| Mode | Style & Persona |
| --- | --- |
| **Tapori** | Authentic Mumbai Hinglish. Street-smart analogies, witty banter. Code output stays clean, robust, and slang-free regardless. |
| **Balanced** | Friendly, natural Hinglish/English balance. Approachable for everyday use. |
| **Professional** | Formal, structured, workplace-ready. Executive summaries, business English. |
| **Developer** | Zero fluff. Senior systems architect voice: Big-O analysis, edge cases, type safety. |
| **Academic** | First-principles pedagogy. Formal definitions, step-by-step derivations. |

> **Core principle:** Intelligent and accurate first, entertaining second. The Tapori personality never compromises factual correctness, security advice, or code quality.

---

## Database Architecture

BANTAI enforces a strict separation between user identity and application data across two independent databases.

```
+------------------------------------------+      +------------------------------------------+
|          MONGODB DATABASE                |      |        FIREBASE CLOUD FIRESTORE          |
|      (User Information ONLY)             |      |   (Conversations & Assistant Data)       |
+------------------------------------------+      +------------------------------------------+
| - userId (Immutable UUID)                |      | - users/{userId}/conversations/{id}      |
| - email, name, username                  |      | - users/{userId}/conversations/../msgs   |
| - passwordHash (bcrypt/argon2)           | <--> | - users/{userId}/tasks/{id}              |
| - account status, roles, timestamps      |      | - users/{userId}/reminders/{id}          |
| - user preferences (theme, voice, lang)  |      | - users/{userId}/memories/{id}           |
| - learningConsent (opt-in toggles)       |      | - users/{userId}/knowledge_docs/{id}     |
|                                          |      |                                          |
| STRICTLY FORBIDDEN:                      |      | FIREBASE STORAGE:                        |
| No chat messages, transcripts or history |      | - users/{userId}/uploads/*               |
+------------------------------------------+      +------------------------------------------+
```

### MongoDB — User Identity Only

Stores: `userId`, `email`, `name`, `username`, `passwordHash`, `accountStatus`, `roles`, timestamps, `preferences`, and `learningConsent` flags.

**Strictly forbidden in MongoDB:** chat messages, conversation history, AI responses, or any transcript content.

### Firebase Cloud Firestore — Conversations and Application Data

```
users/{userId}/conversations/{conversationId}
users/{userId}/conversations/{conversationId}/messages/{messageId}
users/{userId}/tasks/{taskId}
users/{userId}/reminders/{reminderId}
users/{userId}/memories/{memoryId}
users/{userId}/knowledge_docs/{documentId}
users/{userId}/music_preferences/{preferenceId}
```

### Firebase Storage — User Uploads

Stores PDFs, DOCX, images, and other attachments under `users/{userId}/uploads/*`.

### Security Rules

- Every read and write is validated server-side against the authenticated `userId`.
- Firebase Security Rules enforce path-level ownership.
- Sensitive fields are encrypted at rest where appropriate.
- Account export and deletion cascade across both databases.

---

## Agentic Engine

`AgentPlannerService` breaks a user goal into an ordered execution plan, selects the right tools, and enforces a human-in-the-loop authorization gate before any sensitive operation runs.

**Execution flow:**

1. Understand the user objective
2. Decompose into ordered steps
3. Select tools and validate permissions
4. Execute — pausing for explicit user approval on sensitive actions
5. Verify results
6. Report completion with evidence

### Tool Registry

| Tool | Description |
| --- | --- |
| `calculator` | Deterministic math parser. No LLM involved. |
| `document_reader` | Read uploaded files by docId. |
| `file_search` | Keyword search across the personal knowledge base. |
| `database_retrieval` | Query tasks, reminders, calendar events, and memories. |
| `rag_retrieval` | 384-dimensional cosine similarity search over local vector chunks. |
| `sandbox_code_executor` | Isolated Node.js VM with memory and timeout limits. **Requires authorization.** |
| `task_manager` | Create, update, and complete tasks. |
| `reminder_scheduler` | Schedule notifications with timezone awareness. |
| `calendar_connector` | Conflict detection and event management. |
| `email_connector` | Search and draft emails. Sending **requires explicit authorization.** |

> No tool reports success without verification. No tool executes arbitrary code on the production server without sandboxing.

---

## Quick Start

### Prerequisites

- Node.js v18+ or v20+
- npm v9+ (pnpm and yarn also work)
- Python 3.10+ (fine-tuning pipeline only)
- [Ollama](https://ollama.com) — optional, for local GPU/CPU inference

### 1. Clone and install

```bash
git clone https://github.com/ivengexnce/bantai.git
cd bantai
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in your MongoDB URI, Firebase credentials, and optional Spotify client ID. All required variables are documented in `docs/ENVIRONMENT.md`.

```bash
cp .env.example .env
```

### 3. Run the test suite

```bash
npm --workspace=@bantai/backend run test
# Expected: 4 test suites, 17 tests — all passing
```

### 4. Start the backend

```bash
npm run dev:backend
# API server: http://localhost:4000
```

### 5. Start the web app

```bash
npm run dev:web
# Web UI: http://localhost:3001
```

### 6. Pull a model (optional but recommended)

```bash
# In a separate terminal
ollama pull qwen2.5:7b    # BANTAI Bhai — default
ollama run qwen2.5:7b
```

If Ollama is not running, BANTAI automatically falls back to its built-in zero-dependency local engine so the full platform remains usable offline.

### Docker (all services in one command)

```bash
docker compose up
# Starts MongoDB, Ollama, Backend, and Web together
```

---

## Fine-Tuning Pipeline

BANTAI includes an actual LoRA/QLoRA training pipeline — not just RAG relabeled as fine-tuning.

**How it works:**

1. Users rate responses. High-quality examples (score ≥ 0.7) enter the feedback buffer.
2. PII scrubber automatically redacts emails, phone numbers, and secrets/tokens before dataset creation.
3. Versioned `train.jsonl`, `val.jsonl`, and `test.jsonl` splits are created.
4. LoRA adapters are trained, evaluated against a baseline, and registered with rollback capability.
5. Only approved adapters are deployed. Consent withdrawal stops future use of that user's data.

> Cross-user training is **strictly disabled by default.** Users must explicitly opt in under Settings > Continuous Learning.

### Run fine-tuning

```bash
python training/scripts/train_lora.py \
  --base_model Qwen/Qwen2.5-7B-Instruct \
  --dataset_path data/learning_datasets/approved_examples_buffer.jsonl \
  --output_dir models/adapters/bantai_v1 \
  --epochs 3 \
  --batch_size 2 \
  --lora_r 16 \
  --qlora
```

### Evaluate

```bash
python training/scripts/evaluate_model.py --model models/adapters/bantai_v1
```

### Model registry and rollback

```bash
python training/scripts/model_registry.py
```

See `docs/FINE_TUNING_PIPELINE.md` for the full governance workflow.

---

## Android APK

Built with React Native and Expo. Package ID: `ai.bantai.app`.

Shares the same backend, authentication, conversation history, tasks, and memory as the web app.

### Build a standalone APK

```bash
cd apps/mobile
eas build --platform android --profile preview --local
```

### Development server

```bash
cd apps/mobile
npx expo start
```

On Android emulator, the app connects to the backend at `10.0.2.2:4000`. On a physical device, update the API base URL in `src/services/api.ts` to your local machine's IP or your deployed backend URL.

See `docs/ANDROID_APK_GUIDE.md` for the full EAS configuration and release build steps.

---

## Hardware Requirements

| Tier | Hardware | RAM / VRAM | Models | Tokens/s |
| :--- | :--- | :--- | :--- | :---: |
| **Minimum** | 4-core CPU (AVX2), no GPU | 16 GB RAM | Chhotu (Q4_K_M) | 8–14 |
| **Recommended** | 8-core CPU + RTX 3060/4070 | 32 GB RAM, 12 GB VRAM | Bhai (FP16), Chhotu | 50+ |
| **Training** | 16-core CPU + RTX 4090 / A100 | 64 GB RAM, 24 GB+ VRAM | Ustad, Don + LoRA/QLoRA | Full fine-tuning |

BANTAI checks available RAM, VRAM, and model compatibility on startup and warns if the selected model exceeds hardware limits. Never promise a speed without measuring it on your actual hardware.

---

## Testing

All 17 automated unit and integration tests pass. Run them with:

```bash
npm --workspace=@bantai/backend run test
# 4 test suites · 17 tests · 100% pass rate
```

| Test Suite | What It Verifies |
| --- | --- |
| `data_separation.test.ts` | MongoDB stores only user data; rejects message bodies at the schema level |
| `auth.test.ts` | Password hashing, JWT signing, unauthorized request rejection |
| `chat_and_tools.test.ts` | Tapori prompt injection, calculator execution, sandbox authorization gate |
| `consent_and_learning.test.ts` | Strict opt-in enforcement, PII scrubbing, versioned dataset generation |

No test is marked passing unless it has actually run and produced a recorded result.

---

## Monorepo Structure

```
bantai/
├── apps/
│   ├── web/              # Next.js 14 App Router + TypeScript + Tailwind (Vercel-ready)
│   └── mobile/           # React Native / Expo — installable Android APK
│
├── packages/
│   ├── backend/          # Node.js / TypeScript Express server (port 4000)
│   │   └── src/
│   │       ├── auth/
│   │       ├── users/
│   │       ├── conversations/
│   │       ├── ai/           # InferenceService — Ollama, llama.cpp, vLLM, local fallback
│   │       ├── agent/        # AgentPlannerService + ToolRegistryService
│   │       ├── memory/       # User-isolated personal memory engine
│   │       ├── rag/          # 384-d local vector embeddings + cosine search
│   │       ├── learning/     # Consent enforcement, PII scrubber, dataset splits
│   │       ├── spotify/      # Mood music integration
│   │       └── __tests__/    # Jest test suites (17/17 passing)
│   └── shared/           # Shared TypeScript types, Zod schemas, Tapori prompts
│
├── training/
│   ├── scripts/
│   │   ├── train_lora.py       # PyTorch + PEFT LoRA/QLoRA fine-tuning
│   │   ├── evaluate_model.py   # 6-dimension benchmark harness
│   │   └── model_registry.py   # Version governance + rollback
│   └── requirements.txt
│
├── docker/
│   ├── docker-compose.yml
│   ├── Dockerfile.backend
│   └── Dockerfile.web
│
├── docs/                 # Full technical documentation
├── .github/workflows/    # GitHub Actions CI (build, test, eval)
└── .env.example
```

---

## Contributing

Pull requests are welcome. For significant changes, open an issue first to discuss what you want to change.

Before submitting:

1. Run `npm --workspace=@bantai/backend run test` and confirm 17/17 passing.
2. Follow the existing TypeScript conventions in `packages/shared/types`.
3. Do not introduce any third-party hosted AI inference dependency.
4. Update the relevant doc in `docs/` if your change affects architecture or API contracts.

---

## Author

**Meet Maru** — Full-Stack Developer, AI/ML Engineering Student

- **GitHub**: [github.com/ivengexnce](https://github.com/ivengexnce)
- **LinkedIn**: [linkedin.com/in/meet-maru-ai](https://linkedin.com/in/meet-maru-ai)
- **Portfolio**: [meetmaru.netlify.app](https://meetmaru.netlify.app)
- **Instagram**: [@meetmaru.dev](https://instagram.com/meetmaru.dev)

If BANTAI helped you or you found it interesting, a star on the repo goes a long way.

---

## License

Distributed under the Apache 2.0 License.

BANTAI is built for sovereign, private, and independent AI. Your model, your data, your infrastructure.
