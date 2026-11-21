# BANTAI — Environment Configuration Guide

This guide details all environment variables supported by the **BANTAI** platform across the backend, web frontend, databases, and inference runtime.

---

## 1. Quick Setup

```bash
# Copy template to active .env
cp .env.example .env
```

---

## 2. Backend Environment Variables (`packages/backend`)

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | Number | `4000` | HTTP port for the Express REST and SSE server. |
| `NODE_ENV` | String | `development` | Environment mode (`development` or `production`). |
| `JWT_SECRET` | String | `bantai-...` | Secret key used for signing and verifying user access JWTs. |
| `MONGODB_URI` | URI | `mongodb://localhost:27017/bantai_users` | MongoDB connection string. **Enforces User-Only data separation rule**. |
| `INFERENCE_PROVIDER` | String | `ollama` | Selected local inference backend: `ollama`, `llamacpp`, `vllm`, or `local`. |
| `OLLAMA_BASE_URL` | URL | `http://localhost:11434` | Base URL for the local Ollama daemon. |
| `LLAMACPP_BASE_URL` | URL | `http://localhost:8080` | Base URL for llama.cpp server instance. |
| `BANTAI_DEFAULT_MODEL` | String | `bhai` | Default active model tier (`chhotu`, `bhai`, `ustad`, `don`). |

---

## 3. Firebase & Storage Variables

If Firebase is not configured or in offline mode, BANTAI gracefully persists user data to isolated JSON files in `data/firestore_store/`.

| Variable | Type | Description |
| :--- | :--- | :--- |
| `FIREBASE_PROJECT_ID` | String | Google Cloud / Firebase project identifier. |
| `FIREBASE_CLIENT_EMAIL` | String | Firebase Service Account email. |
| `FIREBASE_PRIVATE_KEY` | PEM String | Firebase Service Account private key (`\n` escaped). |
| `FIREBASE_STORAGE_BUCKET`| String | Bucket name for uploaded documents and attachments. |

---

## 4. Web Application Frontend (`apps/web`)

Configured via `apps/web/.env.local` or environment injection in Vercel:

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | URL | `http://localhost:4000/api` | Base URL pointing to the BANTAI backend API. |

---

## 5. Model Family Mapping

The backend routes branded BANTAI models to open-weight model tags via `AI_MODELS` configuration:

| Display Name | Internal Key | Default Ollama Tag |
| :--- | :--- | :--- |
| **BANTAI Chhotu** | `chhotu` | `qwen2.5:3b` |
| **BANTAI Bhai** | `bhai` | `qwen2.5:7b` *(Default)* |
| **BANTAI Ustad** | `ustad` | `qwen2.5:14b` |
| **BANTAI Don** | `don` | `qwen2.5:32b` |

---

## 6. Optional Services

| Variable | Purpose |
| :--- | :--- |
| `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` | Mood-based music playback recommendation tool. |
| `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` | Google Sign-In authentication. |
