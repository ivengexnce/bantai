# BANTAI — Environment Configuration Guide

This guide documents all environment variables read by `backend/src/config/env.ts`, `frontend/web/next.config.mjs`, `.env.example`, and `docker/docker-compose.yml`.

---

## 1. Quick Setup

```bash
cp .env.example .env
```

---

## 2. Backend Environment Variables (`backend`)

| Variable | Type | Default (`env.ts`) | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | Number | `4000` | HTTP port for Express REST and SSE server. |
| `NODE_ENV` | String | `development` | Runtime mode (`development`, `production`, or `test`). |
| `JWT_SECRET` | String | *(Dev fallback in code; required in Docker/Prod)* | HMAC `HS256` secret key for signing/verifying user JWTs. |
| `JWT_EXPIRES_IN` | String | `7d` | Token expiry duration passed to `jsonwebtoken`. |
| `MONGODB_URI` | URI | `mongodb://localhost:27017/bantai_users` | MongoDB connection string (Docker Compose & production driver target; user partition only). |
| `INFERENCE_PROVIDER` | String | `ollama` | Local AI engine: `ollama`, `llamacpp`, `vllm`, or `local_engine`. |
| `OLLAMA_BASE_URL` | URL | `http://localhost:11434` | Local Ollama daemon URL. |
| `LLAMACPP_BASE_URL` | URL | `http://localhost:8080` | Local llama.cpp server URL. |
| `VLLM_BASE_URL` | URL | `http://localhost:8000` | Local vLLM server URL. |
| `DEFAULT_MODEL` | String | `qwen2.5:7b` | Fallback model name when unmapped. *(Note: `.env.example` also lists `BANTAI_DEFAULT_MODEL=bhai` for reference.)* |
| `CLIENT_URLS` | CSV URLs | `http://localhost:3000,http://localhost:3001,http://localhost:8081,http://10.0.2.2:4000` | Allowed CORS origins in addition to built-in localhost/emulator origins. |
| `ELEVENLABS_API_KEY` | String | `""` *(Optional)* | Server-side ElevenLabs key for `/api/voice/elevenlabs/tts`. |
| `UPLOAD_DIR` | String | `uploads` | Directory for local uploads (max 50 MB). |
| `GOOGLE_CLIENT_ID` | String | Unset *(Optional)* | Required outside `production` to enable `/api/auth/google`; otherwise returns `501`. |

---

## 3. Firebase Cloud Firestore Variables

Firebase Admin SDK checks, in order: `security/serviceAccountKey.json`, `serviceAccountKey.json`, `backend/serviceAccountKey.json`, `GOOGLE_APPLICATION_CREDENTIALS`, or the environment variables below. When none are present, BANTAI uses local JSON persistence in `backend/data/firestore_store/`.

| Variable | Default / Project | Description |
| :--- | :--- | :--- |
| `FIREBASE_PROJECT_ID` | `bantai-production` | Google Cloud / Firebase project ID. |
| `FIREBASE_CLIENT_EMAIL` | `""` | Firebase Service Account client email. |
| `FIREBASE_PRIVATE_KEY` | `""` | PEM private key (escaped `\n` sequences automatically unescaped). |
| `FIREBASE_STORAGE_BUCKET` | `bantai-production.appspot.com` | Firebase Storage bucket name. |
| `GOOGLE_APPLICATION_CREDENTIALS` | Unset *(Optional)* | Filesystem path to service account JSON key. |

---

## 4. Web Frontend Variables (`frontend/web/.env.local`)

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | URL | `http://localhost:4000/api` | Base URL for backend REST and SSE calls (`frontend/web/next.config.mjs`). |
| `PORT` | Number | `3001` | Port used by Next.js `dev` and `start` scripts (`package.json`). |
| `NEXT_PUBLIC_ELEVENLABS_API_KEY` | String | Optional | Optional client key passed as `x-elevenlabs-key` if browser voice chooses ElevenLabs; never commit real keys to git. |

---

## 5. Active Local Model Mapping (`InferenceService`)

| Display Name | Internal Key | Target Ollama Model | Base Open Weight |
| :--- | :--- | :--- | :--- |
| **BANTAI Chhotu** | `chhotu` | `bantai-chhotu` | `qwen2.5:3b` |
| **BANTAI Bhai** *(Default)* | `bhai` | `bantai-bhai` | `qwen2.5:7b` |
