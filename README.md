# BANTAI — Apna Model. Apna Dimaag. Apna AI.

> **Production Self-Hosted Agentic AI Platform with Authentic Mumbai Tapori Personality, Dual-Database Architecture, Zero Third-Party AI APIs, and an Opt-In Continuous Fine-Tuning Pipeline.**

---

## 1. Product Identity & Core Philosophy

**BANTAI** is an end-to-end, production-oriented agentic AI assistant combining the conversational power of ChatGPT/Claude with personal assistant automation, persistent isolated memory, local vector RAG, multi-step tool execution, and an approval-gated LoRA fine-tuning engine.

- **Product Name**: BANTAI
- **Tagline**: *Apna Model. Apna Dimaag. Apna AI.*
- **Core Personality**: Mumbai Tapori (*Bhai ka swag, dimaag ekdum sharp!*)
- **Core Principle**: **Intelligent and accurate FIRST, entertaining SECOND.** Slang is never used inside technical code snippets or serious safety contexts.
- **Supported Languages**: Natural Hinglish, Hindi, and English.
- **Sovereign AI**: 100% self-hosted on user-controlled infrastructure. **Zero dependencies on external hosted LLM inference APIs** (no OpenAI, no Anthropic, no Gemini, no Groq, no OpenRouter).

---

## 2. Five Major Systems in BANTAI

```
+-----------------------------------------------------------------------------------------+
|                                    BANTAI PLATFORM                                      |
+-----------------------------------------------------------------------------------------+
| 1. Conversational AI   | Multi-turn chat, SSE streaming, 5 switchable personality modes |
| 2. Personal Assistant  | Tasks, Reminders, Calendar, Email assistant, Voice interaction |
| 3. Agentic Engine      | Goal planner, Step executor, 10 tools, human authorization gate|
| 4. Personal Memory     | User-isolated semantic facts, preferences, and project context |
| 5. Hybrid Learning     | Opt-in feedback, PII scrubbing, versioned LoRA fine-tuning     |
+-----------------------------------------------------------------------------------------+
```

---

## 3. Personality Modes

Users can toggle modes instantly from the top header or settings:

| Mode | Tagline | Style & Characteristics |
| :--- | :--- | :--- |
| **Tapori Mode** | *Full Mumbai Style* | Street-smart, witty Mumbai Hinglish (*"Arey bantai! Bol na kya mamla hai"*). Explains complex engineering using vivid Mumbai street analogies, but outputs production-clean code without slang. |
| **Balanced Mode** | *Natural Conversational* | Friendly, polite, natural Hinglish/English balance with approachable warmth. |
| **Professional Mode** | *Workplace Ready* | Formal, concise, structured executive summaries, business English/Hindi. |
| **Developer Mode** | *Zero Fluff, Pure Code* | Senior systems architect persona: Big-O analysis, robust typing, edge-case handling. |
| **Academic Mode** | *Research & Learning* | Scholarly, first-principles pedagogical breakdowns and formal definitions. |

---

## 4. Strict Database Architecture — Data Separation Policy

BANTAI enforces a strict separation of concerns between user identity and conversation data:

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

---

## 5. Agentic Engine & Tool Registry

BANTAI's `AgentPlannerService` breaks goals down into multi-step execution plans. Tools requiring sensitive actions pause and require human-in-the-loop authorization before execution:

1. **`calculator`**: Safe math parser for deterministic numeric evaluation.
2. **`document_reader`**: Document text inspection by `docId`.
3. **`file_search`**: Personal knowledge base search matching keywords.
4. **`database_retrieval`**: Query personal tasks, reminders, calendar, and memories.
5. **`rag_retrieval`**: 384-dimensional cosine similarity search across local vector chunks.
6. **`sandbox_code_executor`**: Isolated Node.js VM sandbox with memory & execution timeout limits. *(Requires user authorization)*.
7. **`task_manager`**: Create, complete, and list tasks in personal registry.
8. **`reminder_scheduler`**: Schedule verified notifications with date, time, and timezone awareness.
9. **`calendar_connector`**: Conflict detection and event management.
10. **`email_connector`**: Search, draft, and send emails. *(Sending emails requires explicit authorization)*.

---

## 6. Monorepo Directory Layout

```
bantai/
├── apps/
│   ├── web/                    # Next.js 14 App Router, TypeScript, Tailwind CSS (Vercel-ready)
│   │   ├── src/app/            # App layout, globals.css, home page
│   │   ├── src/components/chat/# Streaming ChatView, audio playback, STT voice input
│   │   ├── src/components/auth/# Mandatory AuthModal (Login, Signup, 1-Click Demo)
│   │   ├── src/components/layout/# Responsive Sidebar, chat search, conversation list
│   │   └── src/components/assistant/# Dashboard, Tasks, Reminders, Knowledge, Memory, Settings
│   └── mobile/                 # React Native / Expo Android application (Installable APK)
│       ├── app.json            # Package ai.bantai.app, permissions, adaptive icon
│       ├── eas.json            # EAS build configuration for standalone .apk
│       ├── App.tsx             # Mobile chat, tasks, settings, audio integration
│       └── src/services/api.ts # Android emulator (10.0.2.2) and LAN auto-connector
├── packages/
│   ├── backend/                # Production Node.js/TypeScript Express server (port 4000)
│   │   ├── src/services/database/ # MongoUserService & FirebaseFirestoreService
│   │   ├── src/services/ai/    # InferenceService (Ollama, llama.cpp, vLLM, Local Engine)
│   │   ├── src/services/agent/ # AgentPlannerService & ToolRegistryService (10 tools)
│   │   ├── src/services/rag/   # Local 384-d vector embeddings & cosine search
│   │   ├── src/services/memory/# Isolated user personal memory engine
│   │   ├── src/services/learning/ # Opt-in consent enforcement, PII scrubber, dataset splits
│   │   └── src/__tests__/      # Automated Jest test suites (17/17 passing)
│   └── shared/                 # Shared TypeScript types, Zod schemas, Tapori prompts
├── training/
│   ├── scripts/
│   │   ├── train_lora.py       # PyTorch + Hugging Face PEFT LoRA/QLoRA fine-tuning script
│   │   ├── evaluate_model.py   # Benchmark evaluation harness across 6 dimensions
│   │   └── model_registry.py   # Model version governance & one-click rollback
│   └── requirements.txt        # PyTorch, PEFT, TRL, Transformers dependencies
├── docker/
│   ├── docker-compose.yml      # Containerized MongoDB, Ollama, Backend, and Web
│   ├── Dockerfile.backend      # Multi-stage production container for Backend
│   └── Dockerfile.web          # Multi-stage production container for Web
├── docs/                       # Comprehensive technical documentation
│   ├── ARCHITECTURE.md         # System architecture & topology
│   ├── DATABASE_SPEC.md        # Strict data separation rules and collection schemas
│   ├── AI_MODELS_AND_INFERENCE.md # Open-weight model benchmarks (Qwen 2.5, Llama 3.1)
│   ├── FINE_TUNING_PIPELINE.md # LoRA fine-tuning, PII screening, consent workflow
│   ├── ANDROID_APK_GUIDE.md    # EAS & local APK build commands
│   ├── VERCEL_DEPLOYMENT_GUIDE.md # Production deployment to Vercel
│   ├── HARDWARE_REQUIREMENTS.md # CPU/GPU VRAM specifications across 3 tiers
│   └── API_REFERENCE.md        # Complete REST API endpoint contracts
├── .github/workflows/ci.yml    # GitHub Actions CI workflow (Build, Test, Eval)
└── README.md                   # Complete master documentation
```

---

## 7. Quick Start Guide

### Prerequisites
- **Node.js**: v18.0.0+ or v20.0.0+
- **npm**: v9.0.0+ (or pnpm / yarn)
- **Python**: 3.10+ (for fine-tuning pipeline)
- *(Optional)* **Ollama**: Download from [ollama.com](https://ollama.com) for GPU inference

### Step 1: Install Dependencies
```bash
git clone https://github.com/your-username/bantai.git
cd bantai
npm install
```

### Step 2: Run Automated Tests
```bash
# Runs 17 unit and integration tests across data separation, auth, tools, and consent
npm --workspace=@bantai/backend run test
```

### Step 3: Start the Backend Server
```bash
npm run dev:backend
# API server starts at http://localhost:4000
```

### Step 4: Start the Web Application
```bash
npm run dev:web
# Web UI opens at http://localhost:3001
```

### Step 5: (Optional) Pull Open-Weight Foundation Model
```bash
# In a separate terminal:
ollama pull qwen2.5:7b
ollama run qwen2.5:7b
```
*(If Ollama is not running, BANTAI automatically uses its built-in zero-dependency local engine fallback so you can use the entire platform offline!)*

---

## 8. Continuous Learning & LoRA Fine-Tuning Pipeline

BANTAI combines real-time user feedback with a privacy-preserving fine-tuning pipeline:

1. **Strict Opt-In Consent**: Cross-user model training is **STRICTLY DISABLED BY DEFAULT**. Users must explicitly enable it under *Settings > Continuous Learning Governance*.
2. **PII Sanitizer**: Automatically detects and redacts emails, phone numbers, and API keys before dataset creation:
   - `john.doe@example.com` $\rightarrow$ `[REDACTED_EMAIL]`
   - `+91 98765 43210` $\rightarrow$ `[REDACTED_PHONE]`
   - `sk-abcdef123456789...` $\rightarrow$ `[REDACTED_TOKEN]`
3. **Dataset Versioning**: High-quality feedback ($\ge 0.7$) creates versioned `train.jsonl`, `val.jsonl`, and `test.jsonl` splits.
4. **Execute Fine-Tuning**:
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
5. **Run Benchmark Evaluation**:
   ```bash
   python training/scripts/evaluate_model.py --model models/adapters/bantai_v1
   ```
6. **Model Registry & Rollback**:
   ```bash
   python training/scripts/model_registry.py
   ```

---

## 9. Android Mobile Application (APK)

Built with React Native & Expo in `apps/mobile`:
- Synchronizes with the shared backend over local Wi-Fi or emulator host (`10.0.2.2:4000`).
- Shares the identical user identity, conversation history, and personal tasks.

### To Build the Installable Standalone `.apk`:
```bash
cd apps/mobile
eas build --platform android --profile preview --local
```
Or start the development server:
```bash
npx expo start
```

---

## 10. Production Vercel Deployment

1. Push your repository to GitHub.
2. In [Vercel](https://vercel.com), click **Add New Project** and select `bantai`.
3. Set **Root Directory** to `apps/web`.
4. Add Environment Variables:
   - `NEXT_PUBLIC_API_URL`: URL of your persistent backend (e.g. `https://api.yourdomain.com/api`).
5. Click **Deploy**. Vercel will build and assign your production domain.

---

## 11. Hardware Requirements

| Tier | Hardware Setup | RAM / VRAM | Models Supported |
| :--- | :--- | :--- | :--- |
| **Minimum** | 4-Core CPU (AVX2), No GPU | 16 GB RAM | `qwen2.5:7b` (Q4_K_M quantized) at 8-14 tok/s |
| **Recommended** | 8-Core CPU + NVIDIA RTX 3060/4070 | 32 GB RAM, 12 GB VRAM | `qwen2.5:7b` (FP16), `llama3.1:8b` (Q8) at 50+ tok/s |
| **Cluster / Training**| 16-Core CPU + NVIDIA RTX 4090 / A100 | 64 GB RAM, 24 GB+ VRAM | Full LoRA/QLoRA fine-tuning across 7B to 32B models |

---

## 12. Quality Assurance & Test Verification

All 17 automated unit and integration tests are verified passing:
- `data_separation.test.ts`: Proves MongoDB strictly stores user data and rejects message bodies.
- `auth.test.ts`: Proves password hashing, JWT signing, and unauthorized request rejection.
- `chat_and_tools.test.ts`: Proves Mumbai Tapori prompts, calculator execution, and sandbox approval gates.
- `consent_and_learning.test.ts`: Proves strict opt-in consent, PII scrubbing, and dataset generation.

```bash
npm --workspace=@bantai/backend run test
# Result: 4 test suites passed, 17 tests passed (100% success rate)
```

---

## 13. License
Distributed under the **Apache-2.0 License**. Built for sovereign, private, and independent AI.
