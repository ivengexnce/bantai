# BANTAI — Self-Hosted AI Models & Inference Specification

## 1. Architectural Mandate
BANTAI prohibits third-party cloud LLM inference APIs (no OpenAI, Anthropic, Gemini, Groq, or OpenRouter). All LLM inference runs locally on user-controlled hardware via Ollama, llama.cpp, vLLM, or BANTAI's built-in deterministic offline dialogue engine. *(Optional ElevenLabs integration is restricted strictly to voice TTS audio synthesis.)*

---

## 2. Active Sovereign Model Lineup

In the active web console (`apps/web/src/lib/models.ts`), mobile app (`apps/mobile/App.tsx`), and backend inference mapper (`packages/backend/src/services/ai/inference.service.ts`), BANTAI exposes two streamlined local models calibrated via custom Ollama `Modelfile` definitions:

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

BANTAI ships calibrated `Modelfile` (`bantai-bhai`) and `Modelfile.chhotu` (`bantai-chhotu`) at the repository root with `temperature 0.6`, `top_p 0.85`, `repeat_penalty 1.15`, Qwen stop tokens (`<|im_start|>`, `<|im_end|>`), and zero-profanity Hinglish system instructions.

```bash
# 1. Install Ollama (https://ollama.com) and start the daemon on port 11434

# 2. Pull upstream Apache 2.0 open-weight base models
ollama pull qwen2.5:3b
ollama pull qwen2.5:7b

# 3. Build branded BANTAI sovereign Ollama models from root Modelfiles
ollama create bantai-chhotu -f Modelfile.chhotu
ollama create bantai-bhai -f Modelfile

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

## 5. Local Vector Embeddings (RAG)

Implemented in `packages/backend/src/services/rag/rag.service.ts`:
- **Descriptor (`LOCAL_EMBEDDING_MODEL`):** `BAAI/bge-small-en-v1.5` (384 dimensions, 512 max sequence tokens).
- **Runtime Implementation:** Computes deterministic 384-dimensional L2-normalized vector embeddings locally from character n-gram hashing + trigonometric projection and scores matches via cosine similarity.
- **Chunking Strategy:** 400 words per chunk with 80-word sliding overlap (`chunkText`).
- **Persistence:** Stored per `userId` in `./data/vector_chunks_store.json`.
