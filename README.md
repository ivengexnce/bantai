# BANTAI

> **Apna Model. Apna Dimaag. Apna AI.**

Build status: 17/17 tests passing | License: Apache 2.0 | Platform: Web + Android | AI: 100% self-hosted | Personality: Mumbai Tapori

**BANTAI** is a production-grade, self-hosted agentic AI platform with an authentic Mumbai Tapori personality. It combines multi-turn conversational AI, a personal assistant, a 10-tool autonomous agent planner, persistent user-isolated memory, local 384-dimensional vector RAG, and an opt-in LoRA fine-tuning pipeline - all executing entirely on local silicon with zero third-party cloud API dependencies.

Zero OpenAI. Zero Anthropic. Zero Gemini. Seedha apna model.

---

## Table of Contents

- [Why BANTAI](#why-bantai)
- [The Sovereign Manifesto: It's Not X, It's Y](#the-sovereign-manifesto-its-not-x-its-y)
- [Model Family](#model-family)
- [Core Systems](#core-systems)
- [Personality Modes](#personality-modes)
- [Dual-Database Air-Gap Architecture](#dual-database-air-gap-architecture)
- [Agentic Engine & Tool Registry](#agentic-engine--tool-registry)
- [Interactive Web Console & CLI Terminal](#interactive-web-console--cli-terminal)
- [Quick Start](#quick-start)
- [Firebase Cloud Firestore Setup](#firebase-cloud-firestore-setup)
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

- **Fully Sovereign:** Zero data leaves your physical infrastructure. Every inference token, embedding vector, and model weight runs on local silicon you control.
- **Strict Dual-Database Air-Gap:** Authentication credentials reside in isolated MongoDB; conversational state, tasks, and memory vectors reside in Firebase Cloud Firestore.
- **Actually Agentic:** Plans multi-step tasks, selects sandboxed tools, enforces human-in-the-loop authorization gates on sensitive actions, and verifies outputs.
- **Deterministic Offline Dialogue Engine:** When an external LLM daemon (like Ollama) is not running, BANTAI falls back to a deterministic semantic and dialogue engine that answers identity, math, coding, science, and world facts without breaking.
- **Authentic Mumbai Tapori Intelligence:** A street-smart Hinglish personality paired with senior software architect reasoning.

---

## The Sovereign Manifesto: It's Not X, It's Y

| Cloud Wrapper Pitfalls | BANTAI Sovereign Reality |
| :--- | :--- |
| **It's not corporate surveillance** | **It's 100% private local execution** where prompts never leave your network boundary. |
| **It's not robotic corporate dialogue** | **It's authentic Mumbai Tapori** paired with deep technical and mathematical rigor. |
| **It's not a single unprotected database** | **It's air-gapped dual-database separation** between authentication and conversational state. |
| **It's not a passive chatbot wrapper** | **It's a 10-tool autonomous agent runtime** with mandatory human authorization gates. |

---

## Model Family

BANTAI runs on open-weight models under its own sovereign naming system, calibrated on Qwen 2.5 and Llama 3 architectures:

| Model | Parameters | Quantization | RAM / VRAM Floor | Throughput | Primary Workload |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **BANTAI Chhotu** | 3 Billion | Q4_K_M | 4 GB RAM / 2 GB VRAM | ~65 tok/s | Edge nodes, rapid classification, low-latency reminder dispatch |
| **BANTAI Bhai (Default)** | 7 Billion | Q4_K_M | 8 GB RAM / 6 GB VRAM | ~42 tok/s | General developer daily driver, full-stack coding, Tapori dialogue |
| **BANTAI Ustad** | 14 Billion | Q4_K_M | 16 GB RAM / 10 GB VRAM | ~28 tok/s | Deep architectural reviews, multi-file refactoring, formal proofs |
| **BANTAI Don** | 32 Billion | Q4_K_M | 32 GB RAM / 20 GB VRAM | ~18 tok/s | Maximum analytical power, complex mathematical modeling, research |

**Taglines:**
- **Chhotu:** *Chhota packet, bada kaam.*
- **Bhai:** *Har kaam ke liye, har waqt ready.*
- **Ustad:** *Jab kaam serious ho, Ustad ko bulao.*
- **Don:** *Seedha Don level. No explanation needed.*

---

## Core Systems

BANTAI is built around five core integrated systems:

| System | Responsibility |
| :--- | :--- |
| **Conversational AI** | Multi-turn chat, SSE token streaming, 5 switchable personality modes, deterministic offline dialogue fallback |
| **Personal Assistant** | Tasks, temporal reminders, calendar conflict analyzer, local memory sync, speech synthesis |
| **Agentic Engine** | Multi-step goal planner, 10 sandboxed tools, mandatory human authorization gates |
| **Personal Memory & RAG** | User-isolated semantic facts, preferences, 384-dimensional dense vectors via BGE-small |
| **Continuous Learning** | Opt-in user feedback buffer, automated PII scrubbing, versioned LoRA fine-tuning splits |

---

## Personality Modes

Switch instantly between modes directly from the chat header or settings:

| Mode | Style & Persona |
| :--- | :--- |
| **Tapori** | Authentic Mumbai Hinglish. Street-smart analogies, witty banter, zero corporate fluff. Code output remains clean and production-ready. |
| **Balanced** | Natural, friendly Hinglish and English balance for daily tasks. |
| **Professional** | Formal, structured, workplace-ready executive summaries. |
| **Developer** | Senior systems architect voice: Big-O analysis, edge cases, type safety, zero disclaimers. |
| **Academic** | First-principles pedagogy: formal definitions, algorithmic invariants, step-by-step derivations. |

---

## Dual-Database Air-Gap Architecture

BANTAI enforces strict separation between user identity and application telemetry across two independent databases:

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

1. **MongoDB (Identity Only):** Holds `userId`, `email`, `name`, `username`, bcrypt-salted password hashes, and consent toggles. Strictly forbidden from persisting chat messages, tool calls, or model outputs.
2. **Firebase Cloud Firestore (Application Telemetry):** Stores conversation records, messages, tasks, reminders, and 384-dimensional embeddings. Protected by 520 lines of CEL security rules (`firestore.rules`).
3. **Local Disk Store Fallback:** If Firebase credentials are not yet configured, BANTAI automatically stores application telemetry in user-isolated local JSON files (`packages/backend/data/firestore_store/`).

---

## Agentic Engine & Tool Registry

`AgentPlannerService` decomposes user goals into ordered execution plans, selects tools, and pauses for human confirmation before running sensitive operations:

| Tool | Capability | Authorization Gate |
| :--- | :--- | :---: |
| `calculator` | Deterministic mathematical evaluation parser | Automated |
| `sandbox_code_executor` | Isolated Node.js VM execution with memory and timeout limits | **Mandatory Human Gate** |
| `file_reader` | Local repository file inspection | Automated |
| `file_writer` | Local source file drafting and updates | **Mandatory Human Gate** |
| `web_search_rag` | Local vector index retrieval with cosine similarity | Automated |
| `task_manager` | Firestore task creation, status updates, and completion | Automated |
| `reminder_service` | Timezone-aware temporal alert scheduler | Automated |
| `calendar_planner` | Schedule conflict detection and calendar runner | Automated |
| `personal_memory` | Semantic memory fact persistence and retrieval | Automated |
| `rag_retriever` | 384-dimensional vector similarity ranking (BGE-small) | Automated |

---

## Interactive Web Console & CLI Terminal

The web frontend (`apps/web`) features a high-performance, responsive design built with Next.js 14, Tailwind CSS, and Framer Motion:

- **Interactive CLI Terminal Window:** Built-in web terminal (`TerminalWindow.tsx`) supporting command presets, interactive typing, execution simulation, latency metrics, and output copying.
- **Live Product Demonstration:** Real-time dialogue runner with model and personality mode tabs, token streaming simulation, and skeleton loaders.
- **Swiss Brutalist & Industrial Glass UI:** 0px or soft corner radiuses, dot grid background, glowing ambient radial orbs, and high-contrast linear gradient accents.
- **Zero Lucide Icons & Emojis:** Custom semantic inline SVGs and clean typography.
- **Integrated Legal Governance:** Built-in Terms of Service (Apache 2.0) and Zero-Telemetry Privacy Policy modals.

---

## Quick Start

### Prerequisites

- Node.js v18+ or v20+
- npm v9+ (or pnpm/yarn)
- Python 3.10+ (for LoRA fine-tuning pipeline only)
- [Ollama](https://ollama.com) (optional, for local neural weight streaming)

### 1. Clone and Install

```bash
git clone https://github.com/ivengexnce/bantai.git
cd bantai
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and verify settings:

```bash
cp .env.example .env
```

### 3. Run Automated Tests

```bash
npm --workspace=@bantai/backend run test
# 4 test suites | 17 tests | 100% passing
```

### 4. Start Backend Server

```bash
npm run dev:backend
# API server: http://localhost:4000
```

### 5. Start Web Frontend

```bash
npm run dev:web
# Web UI: http://localhost:3001
```

### 6. Pull Local Model (Optional)

```bash
# In a separate terminal
ollama pull qwen2.5:7b
ollama run qwen2.5:7b
```

*Note: If Ollama is offline, BANTAI automatically falls back to its built-in deterministic local dialogue engine.*

---

## Firebase Cloud Firestore Setup

BANTAI connects to Google Cloud Firestore (such as project `bantai-369` in `asia-south1`) using the official Firebase Admin SDK:

1. **Deploy Security Rules:**
   - In Firebase Console, navigate to **Firestore Database** > **Rules**.
   - Copy the contents of `firestore.rules` and click **Publish**.
   - Alternatively, deploy via CLI: `firebase deploy --only firestore:rules`.
2. **Add Service Account Key:**
   - In Firebase Console, go to **Project Settings** > **Service accounts** > **Firebase Admin SDK**.
   - Click **Generate new private key**.
   - Place the downloaded JSON file at:
     ```text
     packages/backend/serviceAccountKey.json
     ```
   - The backend automatically detects the key and syncs chats, tasks, and memories to live Firestore.

---

## Fine-Tuning Pipeline

BANTAI includes an actual LoRA / QLoRA training pipeline using PyTorch and Hugging Face PEFT:

1. **Feedback Aggregation:** Responses rated with score >= 0.7 enter the learning buffer.
2. **Automated PII Scrubbing:** Redacts emails, phone numbers, API keys, and sensitive tokens before dataset creation.
3. **Dataset Splits:** Generates versioned `train.jsonl`, `val.jsonl`, and `test.jsonl` files.
4. **LoRA Adapter Training:**
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
5. **Model Evaluation & Registry:**
   ```bash
   python training/scripts/evaluate_model.py --model models/adapters/bantai_v1
   python training/scripts/model_registry.py
   ```

*Cross-user training is strictly disabled by default. Users must explicitly opt in under Settings > Continuous Learning.*

---

## Android APK

Built with React Native and Expo (`ai.bantai.app`):

```bash
cd apps/mobile
npx expo start

# Build standalone Android APK
eas build --platform android --profile preview --local
```

---

## Hardware Requirements

| Tier | Hardware Profile | RAM / VRAM | Models | Tokens/s |
| :--- | :--- | :--- | :--- | :---: |
| **Minimum** | 4-core CPU (AVX2), no GPU | 16 GB RAM | Chhotu (3B Q4_K_M) | 8 - 14 |
| **Recommended** | 8-core CPU + RTX 3060 / 4070 | 32 GB RAM, 12 GB VRAM | Bhai (7B), Chhotu (3B) | 40 - 55 |
| **Workstation** | 16-core CPU + RTX 4090 / A100 | 64 GB RAM, 24 GB+ VRAM | Ustad (14B), Don (32B) | 25 - 45 |

---

## Testing

All 17 automated tests verify security invariants and runtime behavior:

```bash
npm --workspace=@bantai/backend run test
```

- `data_separation.test.ts`: Rejects messages and prompts in MongoDB schemas.
- `auth.test.ts`: Validates bcrypt hashes, JWT tokens, and unauthorized access rejection.
- `chat_and_tools.test.ts`: Verifies Tapori prompt injection, math evaluation, and sandbox gates.
- `consent_and_learning.test.ts`: Enforces PII scrubbing and opt-in consent verification.

---

## Monorepo Structure

```text
bantai/
├── apps/
│   ├── web/              # Next.js 14 App Router, Tailwind, Framer Motion (port 3001)
│   └── mobile/           # React Native / Expo Android app (ai.bantai.app)
│
├── packages/
│   ├── backend/          # Node.js / TypeScript Express server (port 4000)
│   │   ├── src/
│   │   │   ├── ai/       # InferenceService: Ollama, llama.cpp, deterministic engine
│   │   │   ├── agent/    # AgentPlannerService + ToolRegistryService (10 tools)
│   │   │   ├── database/ # MongoService (credentials) + FirebaseService (telemetry)
│   │   │   ├── memory/   # User-isolated semantic facts and preferences
│   │   │   └── rag/      # 384-d local vector embeddings + cosine similarity
│   │   └── data/         # Local user-isolated JSON stores for offline development
│   └── shared/           # Shared TypeScript types, Zod schemas, Tapori prompts
│
├── firestore.rules       # 520 lines of fine-grained CEL Firestore security rules
├── firebase.json         # Firebase project configuration
├── .firebaserc           # Firebase project target (bantai-369)
│
├── training/             # PyTorch + PEFT LoRA/QLoRA training and evaluation scripts
├── docker/               # Docker Compose and Dockerfiles
└── docs/                 # Architecture, API specifications, and setup guides
```

---

## Contributing

Pull requests are welcome. Before submitting:
1. Run `npm --workspace=@bantai/backend run test` and confirm all 17 tests pass.
2. Follow strict TypeScript conventions.
3. Never introduce third-party cloud AI API dependencies.
4. Maintain air-gap database isolation.

---

## Author

**Meet Maru** - Full-Stack Developer, AI/ML Engineering Student

- **GitHub:** [github.com/ivengexnce](https://github.com/ivengexnce)
- **LinkedIn:** [linkedin.com/in/meet-maru-ai](https://linkedin.com/in/meet-maru-ai)
- **Portfolio:** [meetmaru.netlify.app](https://meetmaru.netlify.app)
- **Instagram:** [@meetmaru.dev](https://instagram.com/meetmaru.dev)

---

## License

Distributed under the **Apache 2.0 License**.

BANTAI is built for sovereign, private, and independent AI. Your model, your data, your infrastructure.
