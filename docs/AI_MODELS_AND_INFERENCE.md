# BANTAI — Self-Hosted AI Models & Inference Specification

## 1. Architectural Mandate
BANTAI prohibits third-party cloud LLM inference APIs (no OpenAI, Anthropic, Gemini, Groq, or OpenRouter). All LLM inference runs locally on user-controlled hardware via Ollama, llama.cpp, vLLM, or BANTAI's built-in deterministic offline dialogue engine. *(Optional ElevenLabs integration is restricted strictly to voice TTS audio synthesis.)*

---

## 2. Active Sovereign Model Lineup

In the active web console (`frontend/web/src/lib/models.ts`), mobile app (`frontend/mobile/App.tsx`), and backend inference mapper (`backend/src/services/ai/inference.service.ts`), BANTAI exposes two streamlined local models calibrated via custom Ollama `Modelfile` definitions:

| Display Name | Model ID | Ollama Model Tag | Base Architecture | Parameters | RAM / VRAM Floor | Primary Strengths |
| :--- | :--- | :--- | :--- | :---: | :--- | :--- |
| **BANTAI Chhotu** | `chhotu` | `bantai-chhotu` | `qwen2.5:3b` | 3B | 4 GB RAM / CPU-ready (~1.9 GB weights) | Ultra-low-latency replies, edge devices, low-memory hardware. *Tagline: "Chhota packet, bada kaam."* |
| **BANTAI Bhai** *(Default)* | `bhai` | `bantai-bhai` | `qwen2.5:7b` | 7B | 8 GB RAM / 6 GB VRAM (~4.7 GB weights) | Daily sovereign driver for coding, system design, and natural Hinglish dialogue. *Tagline: "Har kaam ke liye, har waqt ready."* |

> **Note:** Both active local routing (`InferenceService`, web/mobile UIs) and `@bantai/shared` `SUPPORTED_MODELS` are cleanly pruned to **`chhotu` (3B)** and **`bhai` (7B)** (`ustad` 14B and `don` 32B were removed).

### Inference Routing Map (`InferenceService`)
`MODEL_BASE_MAP` resolves incoming client IDs to active local Ollama models:
- `'chhotu'`, `'qwen2.5:3b'`, `'bantai-chhotu'` -> `bantai-chhotu`
- `'bhai'`, `'qwen2.5:7b'`, `'bantai-bhai'` -> `bantai-bhai`

---

## 3. Local Setup via Ollama & Custom Modelfiles

BANTAI ships calibrated `models/ollama/Modelfile` (`bantai-bhai`) and `models/ollama/Modelfile.chhotu` (`bantai-chhotu`) with `temperature 0.6`, `top_p 0.85`, `repeat_penalty 1.15`, Qwen stop tokens (`<|im_start|>`, `<|im_end|>`), and zero-profanity Hinglish system instructions.

```bash
# 1. Install Ollama (https://ollama.com) and start the daemon on port 11434

# 2. Pull upstream Apache 2.0 open-weight base models
ollama pull qwen2.5:3b
ollama pull qwen2.5:7b

# 3. Build branded BANTAI sovereign Ollama models from models/ollama/
ollama create bantai-chhotu -f models/ollama/Modelfile.chhotu
ollama create bantai-bhai -f models/ollama/Modelfile

# 4. Verify active models
ollama list
curl http://localhost:11434/api/tags
```

---

## 4. Fallback & Execution Order (`InferenceService`)

1. **`ollama` (Primary):** Streams NDJSON token chunks from `${OLLAMA_BASE_URL}/api/chat` with a 60s request timeout (`temperature: 0.7`, `top_p: 0.9`).
2. **`llamacpp` (Optional Provider):** When `INFERENCE_PROVIDER=llamacpp`, connects to `${LLAMACPP_BASE_URL}/v1/chat/completions` for direct GGUF execution.
3. **`local_engine` (Deterministic Offline Fallback):** Automatically activates if Ollama or llama.cpp is unreachable or errors out, answering identity queries, personality dialogue, DSA (QuickSort, Binary Search), React/TypeScript/Python/Docker topics, arithmetic, RAG concepts, and structured guidance across all 5 personality modes without third-party APIs.

---

## 5. Local Hybrid RAG Retrieval

Implemented in `backend/src/services/rag/rag.service.ts`:
- **Ranking Architecture:** Hybrid retrieval combining lexical **BM25 (`k1=1.5, b=0.75`)** (`0.55` weight) with **256-dimensional Djb2 word unigram + character 3-gram L2-normalized cosine similarity** (`0.45` weight) — zero third-party embedding API calls.
- **Chunking Strategy:** 550-character sentence-aware windows with 100-character overlap (`chunkText`).
- **Persistence:** Stored per `userId` in `./data/rag_vectors.json` with atomic write serialization and GDPR purge support.
