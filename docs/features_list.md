# BANTAI — Complete Feature List & Capability Matrix

**Product:** **BANTAI** (*Apna Model. Apna Dimaag. Apna AI.*)  
**Architecture:** Local-First, Self-Hosted Agentic AI Platform (Zero Cloud LLM API Dependencies)  
**Platforms:** Express/TypeScript API (`@bantai/backend`), Next.js 14 Web Console (`@bantai/web`), Expo React Native Mobile App (`@bantai/mobile`), Shared Zod/TS Contracts (`@bantai/shared`), QLoRA Python Training Pipeline (`training/`)

---

## 1. Core AI Chat & Personality Engine

| Feature | Description | Status | Location / Endpoint |
| :--- | :--- | :--- | :--- |
| **SSE Token Streaming Chat** | Real-time Server-Sent Events streaming with client-disconnect abort handling and auto conversation titling | Implemented | `POST /api/chat/stream`, `ChatView.tsx` |
| **Local Model Lineup** | **BANTAI Chhotu** (`qwen2.5:3b`, fast/CPU-ready) & **BANTAI Bhai** (`qwen2.5:7b`, default all-rounder) | Implemented | `Modelfile`, `Modelfile.chhotu`, `shared/src/constants` |
| **Multi-Backend Inference** | Self-hosted **Ollama** (`/api/chat`) and **llama.cpp** (`/v1/chat/completions`) with automatic deterministic offline fallback engine | Implemented | `backend/src/services/ai/inference.service.ts` |
| **4 Personality Modes** | **Balanced** (natural English & clean Hinglish/Hindi, zero slang), **Professional**, **Developer**, **Academic** | Implemented | `shared/src/prompts/personalities.ts` |
| **Prompt Injection Defense** | Strips `<|im_start|>`/`<|im_end|>` control tokens and fences RAG/memory data in `<untrusted_reference_data>` tags | Hardened | `shared/src/prompts/personalities.ts` |
| **Conversation History Management** | Create, list, search, load message transcripts, and cascade-delete conversations | Implemented | `POST/GET/DELETE /api/chat/conversations` |
| **Message Feedback Loop** | Thumbs-up / thumbs-down rating (`up` / `down`), reason codes, and optional correction text | Implemented | `POST /api/chat/feedback` |
| **Rich Markdown & Code Blocks** | Safe React-rendered headings, lists, bold/inline code, syntax blocks, and one-click code copy (XSS-safe) | Implemented | `frontend/web/src/components/chat/ChatView.tsx` |
| **File & PDF Context Attachment** | `.txt/.md/.csv/.json/.log` prompt attachments plus bounded `.pdf` (up to `1.4 MB`) extraction & Knowledge indexing | Implemented | `ChatView.tsx`, `MemoryView.tsx`, `pdf_extractor.ts` |

---

## 2. Authentication, Session Lifecycle & Access Control

| Feature | Description | Status | Location / Endpoint |
| :--- | :--- | :--- | :--- |
| **Email/Password Registration & Login** | Strict Zod validation, duplicate email/username checks, `bcryptjs` cost-12 hashing (`<=72` byte guard), uniform `401` responses | Hardened | `POST /api/auth/signup`, `POST /api/auth/login` |
| **HS256 JWT + Cookie/CSRF Transport** | Explicit `HS256` algorithm, `iss`/`aud`/`jti` claims, `HttpOnly`/`SameSite=Lax` cookie transport (with HTTPS-aware `Secure` detection) + Double-Submit `X-CSRF-Token` & `Origin`/`Referer` validation alongside Bearer auth for mobile/API clients | Hardened | `backend/src/utils/jwt.ts`, `cookies.ts`, `auth.middleware.ts` |
| **Session & Token Revocation** | Single-token logout revocation (`jti`), global logout (`allSessions`), `tokenVersion` invalidation on password change, reset & account wipe | Hardened | `POST /api/auth/logout`, `POST /api/auth/change-password` |
| **Multi-Factor Authentication (TOTP)** | RFC 6238 TOTP secret enrollment (`otpauth://`), 6-digit code verification with step anti-replay (`mfaLastUsedStep`), half-auth `mfa_challenge` token separation, SHA-256 single-use recovery codes | Hardened | `/api/auth/mfa/*`, `AuthScreen.tsx`, `SettingsView.tsx` |
| **Password Recovery Flow** | Single-use, 15-minute expiring SHA-256 hashed reset tokens with constant non-enumerating `/forgot-password` responses and session invalidation | Hardened | `POST /api/auth/forgot-password`, `reset-password`, `AuthScreen.tsx` |
| **OAuth Simulation Protection** | Rejects unverified `/api/auth/google` calls with `501` unless explicit dev simulation flag is set | Hardened | `POST /api/auth/google` |
| **Role-Based Access Control (RBAC)** | Deny-by-default `requireAuth`, mass-assignment prevention on signup, `requireRole('admin')` on dataset export | Hardened | `auth.middleware.ts`, `learning.routes.ts` |
| **GDPR Account & Data Erasure** | Full cross-database deletion across MongoDB user store & Firebase/local stores plus instant session revocation | Implemented | `POST /api/learning/wipe-data` |

---

## 3. Agentic Engine, Tools & Personal Assistant

| Feature | Description | Status | Location / Endpoint |
| :--- | :--- | :--- | :--- |
| **Multi-Step Agent Planner** | Decomposes goals into sequential tool steps (`planning -> executing / waiting_approval -> completed`) | Implemented | `POST /api/assistant/agent/plan`, `execute/:planId` |
| **Human-in-the-Loop Approval Gate** | Pauses sensitive operations (`sandbox_code_executor`, `email_connector` `send`) until explicit user approval/rejection | Hardened | `POST /api/assistant/agent/approve-step` |
| **10 Registered Agent Tools** | `calculator`, `document_reader`, `file_search`, `database_retrieval`, `rag_retrieval`, `sandbox_code_executor`, `task_manager`, `reminder_scheduler`, `calendar_connector`, `email_connector` | Hardened | `tool_registry.service.ts` |
| **Safe Calculator (Zero `vm`)** | Pure recursive-descent math parser supporting arithmetic, parentheses, `PI`/`E`, and allowlisted `Math.*` functions | Hardened | `backend/src/services/agent/safe_eval.ts` |
| **OS-Isolated Code Sandbox** | Runs user-approved JS snippets in an isolated `node --permission` child process with cleared `env`, stripped builtins, and `SIGKILL` timeout | Hardened | `backend/src/services/agent/safe_eval.ts` |
| **Task Manager CRUD** | Priority (`low`/`medium`/`high`/`urgent`), status lifecycle, subtasks, tags, recurring options, auto `completedAt` | Implemented | `/api/assistant/tasks` |
| **Reminder Scheduler CRUD** | ISO-8601 scheduled notifications, timezone awareness (`Asia/Kolkata` default), recurring & delivery channels | Implemented | `/api/assistant/reminders` |
| **Calendar Event Management** | Event creation with strict `endTime > startTime` ISO validation and listing | Hardened | `/api/assistant/calendar` |

---

## 4. Personal Memory, Knowledge Base & Local RAG

| Feature | Description | Status | Location / Endpoint |
| :--- | :--- | :--- | :--- |
| **User-Isolated Personal Memory** | Auto-extraction (`I prefer...`, `My goal is...`) and manual CRUD across 5 categories (`preference`, `fact`, `project`, `goal`, `instruction`) | Implemented | `/api/assistant/memory`, `MemoryView.tsx` |
| **Memory Consent Toggle** | Instant opt-in/out switch (`personalMemoryEnabled`) blocking extraction & system prompt injection when off | Implemented | `PATCH /api/auth/consent` |
| **Hybrid BM25 + Cosine RAG Engine** | Deterministic dense cosine + BM25 lexical ranking (`0.55 * normBm25 + 0.45 * cosine`), overlapping chunking, and user-isolated purge | Implemented | `backend/src/services/rag/rag.service.ts` |
| **Safe Document & PDF Ingestion** | Filename regex validation (zero `..` traversal), extension allowlist (`.txt/.md/.csv/.json/.log/.pdf`), `unpdf` extractor with `%PDF-` / 50-page / `1.4MB` caps | Hardened | `POST /api/assistant/knowledge/upload` |

---

## 5. Voice Input & Neural Text-to-Speech

| Feature | Description | Status | Location / Endpoint |
| :--- | :--- | :--- | :--- |
| **On-Device Web Speech STT/TTS** | Browser SpeechRecognition (`en-IN` for Balanced, `en-US` otherwise), markdown/emoji cleaning, 160-char sentence chunking & Chromium keep-alive | Implemented | `frontend/web/src/lib/voiceEngine.ts` |
| **Server-Side ElevenLabs Integration** | Neural TTS proxy with `AbortController` timeouts, `voiceId`/`modelId` path injection validation, 5,000-char caps, zero client key exposure | Hardened | `GET /api/voice/elevenlabs/voices`, `POST /tts` |

---

## 6. Continuous Learning & QLoRA Fine-Tuning Pipeline

| Feature | Description | Status | Location / Endpoint |
| :--- | :--- | :--- | :--- |
| **Strict Opt-In Training Consent** | `crossUserTrainingOptIn: false` by default; tracks consent & withdrawal timestamps and policy version (`1.0.0-2026`) | Implemented | `learning.service.ts`, `PATCH /api/auth/consent` |
| **Automated PII Redaction** | Strips API keys (`sk-`/`ghp_`/`AIza`/`AKIA`), Bearer/JWT tokens, DB URI passwords, emails, and phones before dataset buffering | Hardened | `learning.service.ts` (`scrubPII`) |
| **Versioned 80/10/10 Dataset Export** | Admin-only export generating `train.jsonl`, `val.jsonl`, `test.jsonl`, and `manifest.json` with path-traversal protection | Hardened | `POST /api/learning/export-dataset` |
| **PyTorch QLoRA Training Engine** | 4-bit NF4 quantization (`bitsandbytes` + `peft`), assistant-only `-100` label masking, dynamic padding, Ampere `bf16`/CUDA auto-detection & `--allow_cpu` fallback | Hardened | `training/scripts/train_lora_real.py` |
| **Model Evaluation & Registry** | 6-dimension evaluation harness and JSON version registry supporting one-click rollback | Implemented | `evaluate_model.py`, `model_registry.py` |

---

## 7. Security Controls, Data Isolation & Infrastructure

| Feature | Description | Status | Location / File |
| :--- | :--- | :--- | :--- |
| **Dual-Database Air-Gap Isolation** | Identity/credentials strictly in `MongoUserService` (`assertNoConversationData` guard); chats/assistant records strictly in `FirebaseFirestoreService` | Implemented | `mongo.service.ts`, `firebase.service.ts` |
| **Hardened Firestore Security Rules** | Strict owner checks, immutable ID/UID/timestamps, parent conversation verification, bounded feedback/lists, root wildcard deny-all | Hardened | `security/firestore.rules` |
| **Security Headers & Strict CORS** | Helmet CSP/HSTS/NoSniff/`no-referrer` on API; Next.js CSP (`frame-ancestors 'none'`) & zero browser source maps; exact URL origin CORS allowlist | Hardened | `backend/src/index.ts`, `next.config.mjs` |
| **Rate Limiting & Log Redaction** | Per-endpoint rate limiters + `sanitizeForLog` stripping CR/LF injection & secret tokens; sanitized prod `500` errors | Hardened | `rate-limit.middleware.ts`, `security.ts` |
| **NoSQL / Prototype Pollution Shield** | Recursive request sanitizer rejecting `$`-prefixed operators and `__proto__`/`constructor`/`prototype` keys across `body`/`query`/`params` | Hardened | `backend/src/middleware/sanitize.middleware.ts` |
| **Static Security & Rules Scanner** | Automated CI SAST scanner validating zero committed secrets/keys, safe subprocess/DOM sinks, zero web `localStorage` JWTs, Docker hardening & Firestore rule invariants | Hardened | `tests/security_static_scan.mjs`, `.github/workflows/ci.yml` |
| **Hardened Containers & CI/CD** | Non-root `USER node` multi-stage Dockerfiles, loopback DB bindings, `cap_drop: ALL`, blocking Gitleaks + QA + Security CI gates | Hardened | `docker/`, `.github/workflows/ci.yml` |

---

## 8. Web & Mobile Client Consoles

| Feature | Description | Status | Location / Component |
| :--- | :--- | :--- | :--- |
| **Authentication Portal (`AuthScreen`)** | Responsive Sign In / Create Account / Forgot & Reset Password + TOTP MFA / Recovery Code Challenge | Implemented | `frontend/web/src/components/auth/AuthScreen.tsx` |
| **Chat Runtime & Sidebar History** | Welcome prompt cards, model cards, SSE streaming, collapsible searchable Chat History sidebar (`New` / switch / delete), assistant ThumbsUp/ThumbsDown feedback, copy & Regenerate buttons | Implemented | `ChatView.tsx`, `GlassIrisNavRail.tsx` |
| **Multi-Agent Live Console (`AgenticView`)** | Real `/api/assistant/agent/*` plan creation, live execution logs, and interactive Human-in-the-Loop Authorization Gate | Implemented | `frontend/web/src/components/assistant/AgenticView.tsx` |
| **Memory Manager (`MemoryView`)** | Searchable 5-category persistent memory cards + live add/delete CRUD | Implemented | `frontend/web/src/components/assistant/MemoryView.tsx` |
| **Fine-Tuning & Personal Dashboard (`FineTuneView`)** | Live backend health telemetry, daemon model availability, live conversation/memory/task metrics, opt-in consent toggle, admin dataset export, and QLoRA CLI guide | Implemented | `frontend/web/src/components/assistant/FineTuneView.tsx` |
| **Settings & Security Console (`SettingsView`)** | Account Profile card, persisted preferences, consent toggles, TOTP MFA enrollment/recovery codes/disable, password rotation, session logout & Danger Zone account wipe | Implemented | `frontend/web/src/components/assistant/SettingsView.tsx` |
| **Android Mobile Client (`@bantai/mobile`)** | React Native Expo auth + MFA challenge, live `/api/chat/*` SSE streaming, live `/api/assistant/tasks` & `/memory` syncing | Implemented | `frontend/mobile/App.tsx`, `src/services/api.ts` |
