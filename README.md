# BANTAI

> **Apna Model. Apna Dimaag. Apna AI.**

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Tests: Passing](https://img.shields.io/badge/Tests-4%20Suites%20Passing-emerald.svg)](https://github.com/ivengexnce/bantai)
[![Platform: Web + Android](https://img.shields.io/badge/Platform-Web%20%2B%20Android-blueviolet.svg)](https://github.com/ivengexnce/bantai)
[![AI: 100% Sovereign](https://img.shields.io/badge/AI-100%25%20Local%20Silicon-amber.svg)](https://github.com/ivengexnce/bantai)

**BANTAI** is a local-first, hardware-aware, self-hosted agentic AI workbench for private reasoning, coding, and bilingual productivity. It combines SSE streaming chat across 4 clean modes (`Balanced`, `Professional`, `Developer`, `Academic`), a 10-tool autonomous agent planner with mandatory human-in-the-loop authorization gates, user-isolated personal memory, local RAG vector search, voice I/O, and real GPU QLoRA fine-tuning — executing on local silicon with zero cloud LLM API dependencies.

Zero OpenAI. Zero Anthropic. Zero Gemini. Seedha apna model.

---

## Live Ports & Entrypoints

- **Web Console (`@bantai/web`):** [http://localhost:3001](http://localhost:3001)
- **Backend API & SSE Daemon (`@bantai/backend`):** `http://localhost:4000` ([Health Check](http://localhost:4000/api/health))
- **Local Inference Daemon (Ollama):** `http://localhost:11434`
- **Mobile APK Target (`@bantai/mobile`):** Android package `ai.bantai.app`

---

## Documentation Index

- [System Architecture](docs/ARCHITECTURE.md)
- [AI Models & Inference](docs/AI_MODELS_AND_INFERENCE.md)
- [REST API Reference](docs/API_REFERENCE.md)
- [Database Spec & Isolation](docs/DATABASE_SPEC.md)
- [Environment Configuration](docs/ENVIRONMENT.md)
- [QLoRA Fine-Tuning Pipeline](docs/FINE_TUNING_PIPELINE.md)
- [Hardware Requirements](docs/HARDWARE_REQUIREMENTS.md)
- [Android APK Build Guide](docs/ANDROID_APK_GUIDE.md)
- [Vercel & Docker Deployment](docs/VERCEL_DEPLOYMENT_GUIDE.md)
- **[UI Elements Requirements (`UI_Element_req.md`)](docs/UI_Element_req.md)**

---

## Model Family

BANTAI runs two locally calibrated Ollama models built from Apache 2.0 `qwen2.5` open weights via `models/ollama/Modelfile` (`bantai-bhai`) and `models/ollama/Modelfile.chhotu` (`bantai-chhotu`):

| Model | ID | Ollama Tag | Base Model | RAM / VRAM | Tagline & Workload |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **BANTAI Chhotu** | `chhotu` | `bantai-chhotu` | `qwen2.5:3b` (3B) | 4 GB RAM · CPU-ready | *"Chhota packet, bada kaam."* Low-latency edge inference. |
| **BANTAI Bhai** *(Default)* | `bhai` | `bantai-bhai` | `qwen2.5:7b` (7B) | 8 GB RAM · 6 GB VRAM | *"Har kaam ke liye, har waqt ready."* Daily coding, reasoning & Hinglish driver. |

> If local Ollama or llama.cpp daemons are offline, `InferenceService` automatically falls back to BANTAI's deterministic offline dialogue engine so the console remains functional.

---

## Obsidian Console UI (`frontend/web`)

Built with Next.js 14 App Router, Tailwind CSS, Framer Motion, Inter + JetBrains Mono typography, and 18px Lucide React icons:

- **64px Fixed Left Navigation Rail (`GlassIrisNavRail`):** Top emblem (starts new chat session), animated tooltips, indigo glow indicator across 5 core views, and profile popover (`Preferences`, `Reset Session`).
- **48px Top Telemetry Bar (`GlassIrisTopBar`):** `BANTAI` wordmark, live model selector badge, runtime health indicator (`Ollama Live` / `Fallback Demo Engine`), 4-mode personality switcher (`Balanced`, `Professional`, `Developer`, `Academic`), and session telemetry (`Chats`, `HttpOnly Cookie` / `MFA Protected`, model tag).
- **5 Core Views:**
  1. **Chat Runtime (`ChatView`):** Centered `760px` canvas with empty-state 48px gradient hero, 2x2 suggested prompt grid, Chhotu/Bhai selector cards, streaming cyan caret, code block copy actions, file attachments, Web Speech STT mic input, TTS readout, and mono composer toggle.
  2. **Multi-Agent Runner (`AgenticView`):** `280px` left task panel + goal launcher + step-by-step build log + human-in-the-loop tool authorization modal.
  3. **Memory Store (`MemoryView`):** Live `/api/assistant/memory` CRUD console with search filtering, drawer form, category badges, and timestamps.
  4. **Fine-Tune LoRA (`FineTuneView`):** QLoRA pipeline dashboard showing opt-in consent status, buffer stats, 80/10/10 split breakdown, GPU execution stream, and local LoRA adapter registry.
  5. **System Settings (`SettingsView`):** Model & Ollama URL configuration, 5 personality persona cards, Web Speech/audio controls, Air-Gap verification status, and Continuous Learning toggles.

---

## Dual-Database Air-Gap Architecture

- **Identity Partition (`MongoUserService`):** Stores user account info, password hashes (bcrypt), preferences, and consent flags (`./data/mongo_users_store.json` locally; MongoDB target via `MONGODB_URI`). Enforces a defensive assertion blocking any conversation or transcript keys.
- **Application Partition (`FirebaseFirestoreService`):** Connects automatically to Google Cloud Firestore when credentials are placed in gitignored `security/serviceAccountKey.json` or environment variables, and falls back to user-isolated local JSON stores (`backend/data/firestore_store/`). Private security rules & Firebase configs remain excluded from git under `security/`.

---

## Quick Start

### Prerequisites
- Node.js v18+ or v20+ and npm v9+
- [Ollama](https://ollama.com) (recommended for live neural inference)
- Python 3.10+ & CUDA GPU (only required to re-run QLoRA training)

### 1. Install Dependencies & Build Shared Types
```bash
git clone https://github.com/ivengexnce/bantai.git
cd bantai
npm install
npm run build --workspace=@bantai/shared
```

### 2. Configure Environment
```bash
cp .env.example .env
```

### 3. Pull & Build Local Ollama Models (Optional)
```bash
ollama pull qwen2.5:3b
ollama pull qwen2.5:7b
ollama create bantai-chhotu -f models/ollama/Modelfile.chhotu
ollama create bantai-bhai -f models/ollama/Modelfile
```

### 4. Run Backend & Web Console
```bash
# Terminal 1: Express API Server (port 4000)
npm run dev:backend

# Terminal 2: Next.js 14 Web Console (port 3001)
npm run dev:web
```

---

## Genuine QLoRA Fine-Tuning (`training/` -> `models/`)

BANTAI includes a real PyTorch + Hugging Face PEFT + `bitsandbytes` 4-bit NF4 QLoRA trainer (`training/scripts/train_lora_real.py`) calibrated for 4 GB VRAM NVIDIA GPUs (tested on RTX A2000 Laptop GPU at 4.0 GB VRAM, `bf16`, `all_linear`, `train=34` / `val=6` over 8 epochs: `train_loss=0.9159`, `eval_loss=3.5295`):

```bash
python training/scripts/train_lora_real.py \
  --base_model Qwen/Qwen2.5-3B-Instruct \
  --dataset_path ./training/datasets/bantai_dataset.jsonl \
  --output_dir ./models/adapters/bantai_v1 \
  --epochs 8 --batch_size 1 --gradient_accumulation_steps 2 \
  --max_seq_length 256 --eval_split 0.15 --all_linear
```

Trained outputs in `models/adapters/bantai_v1/` include `adapter_model.safetensors`, `adapter_config.json`, `tokenizer.json`, and `training_manifest.json` (`bantai-v2.0-sovereign`). Latest measured evaluation in `training/eval_report.json`: **4/5 (80.0%) PASSED, 100.0% slang-free**. Re-run evaluation and inspect registry state with:

```bash
python training/scripts/evaluate_model.py --model models/adapters/bantai_v1
python training/scripts/model_registry.py
```

---

## Testing (`tests/`)

Automated suites verify authentication, database air-gap enforcement, tool sandboxing, PII scrubbing, PDF/Hybrid RAG ingestion, durable state recovery, SMTP/outbox delivery, and streaming inference:

```bash
npm test
npm run test:security
npm run security:scan
```

- `tests/auth.test.ts`: Signup, login, invalid password rejection, protected JWT verification.
- `tests/data_separation.test.ts`: Rejects conversation data in `MongoUserService`; isolates Firestore records by `userId`.
- `tests/chat_and_tools.test.ts`: Personality prompts, calculator, sandbox code execution gate, task manager, live/offline SSE chat streaming.
- `tests/consent_and_learning.test.ts`: PII redaction (`[REDACTED_EMAIL]`, `[REDACTED_PHONE]`, `[REDACTED_TOKEN]`), opt-in checks, memory gating, dataset export, and buffer purge on withdrawal.
- `tests/api_functional_integration.test.ts`: End-to-end CRUD, SSE, durable agent plan persistence across restarts, RFC 5545 `.ics` / RFC 5322 `.eml`, bounded `.pdf` ingestion, Hybrid BM25 + Cosine RAG ranking, and complete GDPR wipe.
- `security/security.test.ts`: CORS allowlist, RBAC, HS256 JWT revocation across state reload, TOTP MFA & recovery codes, CSRF double-submit cookies, forgot-password mail delivery, daily ElevenLabs quota caps, loopback workstation guard, NoSQL/prototype injection, and rate limiting.

---

## Monorepo Structure

```text
bantai/
├── frontend/
│   ├── web/                  # Next.js 14 Web Console (port 3001)
│   └── mobile/               # React Native / Expo Android Client (ai.bantai.app)
├── backend/                  # Express TypeScript API Daemon (port 4000)
│   └── src/                  # config, controllers, middleware, routes, services, utils
├── shared/                   # Shared TS types, Zod schemas, constants, prompts
├── models/
│   ├── ollama/               # Modelfile (Bhai 7B), Modelfile.chhotu (Chhotu 3B)
│   └── adapters/bantai_v1/   # Genuine LoRA adapter weights & tokenizer
├── training/                 # datasets/, scripts/ (train_lora_real.py, eval, registry)
├── tests/                    # Centralized Jest + Supertest suites & jest.config.js
├── docs/                     # System specs, setup guides & UI_Element_req.md
├── docker/                   # docker-compose.yml, Dockerfile.backend, Dockerfile.web
└── security/                 # [GITIGNORED] Private Firebase configs, keys & security checks
```

---

## Author & License

**Meet Maru** — Full-Stack Developer, AI/ML Engineering Student  
GitHub: [github.com/ivengexnce](https://github.com/ivengexnce) · LinkedIn: [linkedin.com/in/meetmaru149](https://www.linkedin.com/in/meetmaru149) · Portfolio: [meetmaru.netlify.app](https://meetmaru.netlify.app)

Distributed under the **Apache 2.0 License**.
