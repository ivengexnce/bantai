# BANTAI — Apna Model. Apna Dimaag. Apna AI.
### Self-Hosted Agentic AI Platform with Mumbai Tapori Personality & Zero 3rd-Party AI APIs

---

## 1. What is BANTAI?
**BANTAI** is a production-oriented, self-hosted agentic AI platform combining the conversational intelligence of ChatGPT/Claude with personal assistant functionality, user-isolated persistent memory, local vector RAG, multi-step tool execution, and an explicit opt-in LoRA continuous fine-tuning pipeline.

- **Tagline**: *Apna Model. Apna Dimaag. Apna AI.*
- **Core Personality**: Mumbai Tapori (Warm, witty, street-smart Hinglish, but strictly intelligent and technically accurate first, entertaining second).
- **Personality Modes**: Tapori, Balanced, Professional, Developer, Academic.
- **Zero 3rd-Party AI APIs**: Prohibits OpenAI, Anthropic, Gemini, Groq, OpenRouter. Connects directly to local open-weight models (Qwen2.5, Llama 3.1, Gemma 2) via Ollama, llama.cpp, or vLLM.

---

## 2. Monorepo Structure

```
bantai/
├── apps/
│   ├── web/                    # Next.js 14 App Router Web Application (Tailwind CSS, Vercel-ready)
│   └── mobile/                 # React Native / Expo Android Application (Installable Standalone APK)
├── packages/
│   ├── backend/                # Production Node.js/TypeScript Express Server (Streaming SSE, Auth, Tools)
│   └── shared/                 # Shared TypeScript Types, Zod Schemas, Personality Prompts
├── training/
│   ├── scripts/
│   │   ├── train_lora.py       # LoRA/QLoRA PyTorch Fine-Tuning Pipeline
│   │   ├── evaluate_model.py   # Benchmark Evaluation Harness
│   │   └── model_registry.py   # Model Version Governance & One-Click Rollback
│   └── requirements.txt        # PyTorch & Hugging Face PEFT dependencies
├── docker/
│   ├── docker-compose.yml      # Orchestrates MongoDB, Ollama, Backend, and Web
│   ├── Dockerfile.backend      # Multi-stage production container for Backend
│   └── Dockerfile.web          # Multi-stage production container for Web
├── docs/                       # Complete Architecture, Database, Hardware & Deployment Documentation
└── package.json                # Monorepo Workspace Configuration
```

---

## 3. Strict Database Separation Policy
- **MongoDB**: Strictly stores User Account & Profile Information (User ID, Email, Password Hash, Preferences, Roles, Consent Timestamps). **No conversation messages or chat history are ever stored in MongoDB.**
- **Firebase Firestore**: Stores conversation documents, messages, feedback records, assistant tasks, reminders, personal memories, and vector knowledge metadata.
- **Unified Identity**: MongoDB and Firebase records share the identical immutable `userId` UUID.

---

## 4. Quick Start Guide

### Prerequisites
- Node.js v18+ or v20+
- npm v9+ or pnpm
- (Optional) Ollama with `qwen2.5:7b` installed: `ollama pull qwen2.5:7b`

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Tests
```bash
# Runs comprehensive unit and integration tests across data separation, auth, tools, and consent
npm --workspace=@bantai/backend run test
```

### 3. Start Backend in Development Mode
```bash
npm run dev:backend
# API starts on http://localhost:4000
```

### 4. Start Web Application in Development Mode
```bash
npm run dev:web
# Web UI opens on http://localhost:3000
```

### 5. Build Android APK
```bash
cd apps/mobile
eas build --platform android --profile preview --local
```

---

## 5. Continuous Learning & Governance
- **Strict Opt-In Consent**: Cross-user model training is **disabled by default**. Users must explicitly opt-in under Settings.
- **PII Scrubbing**: Automatic redaction of emails, phone numbers, and API tokens before dataset curation.
- **Model Governance**: Tracked via `training/scripts/model_registry.py` with instant rollback capabilities.

---

## 6. License
Apache-2.0 License. Built for independent, private, self-hosted AI sovereignty.
