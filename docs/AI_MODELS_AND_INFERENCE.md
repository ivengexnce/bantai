# BANTAI — Self-Hosted AI Models & Inference Specification

## 1. Architectural Mandate
BANTAI strictly prohibits external third-party inference APIs (no OpenAI, no Anthropic, no Gemini, no Groq, no OpenRouter). All core intelligence runs locally or on user-controlled infrastructure.

---

## 2. Supported Foundation Models

| Model ID | Family | Parameters | Context Window | VRAM Required | Primary Strengths |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `qwen2.5:7b` | Qwen | 7.6B | 32,768 | ~5.1 GB (Q4_K_M) | **Top Choice**: Exceptional Hindi/Hinglish understanding, coding, reasoning, and tool calling. |
| `llama3.1:8b` | Llama | 8.0B | 131,072 | ~5.8 GB (Q4_K_M) | Massive 128k context, strong structured output formatting. |
| `gemma2:9b` | Gemma | 9.2B | 8,192 | ~6.5 GB (Q4_K_M) | High factual grounding, sliding-window attention architecture. |
| `qwen2.5-coder:7b` | Qwen | 7.6B | 32,768 | ~5.1 GB (Q4_K_M) | Specialized for AST manipulation, unit test synthesis, Developer Mode. |

---

## 3. Local Inference Setup via Ollama
To run the primary model locally:

```bash
# 1. Install Ollama (https://ollama.ai)
# Windows: Download from ollama.com/download/windows
# Linux: curl -fsSL https://ollama.com/install.sh | sh

# 2. Pull Qwen 2.5 7B Instruct
ollama pull qwen2.5:7b

# 3. Verify it is running
curl http://localhost:11434/api/tags
```

---

## 4. Alternative: llama.cpp GGUF Execution
For systems optimizing every megabyte of CPU/GPU memory:

```bash
# Run quantized GGUF directly with llama-server
./llama-server \
  --model ./models/qwen2.5-7b-instruct-q4_k_m.gguf \
  --port 8080 \
  --ctx-size 8192 \
  --n-gpu-layers 33
```

---

## 5. Local Vector Embeddings (RAG)
BANTAI utilizes local sentence transformers:
- **Model**: `BAAI/bge-small-en-v1.5` (or local 384-dimensional cosine embeddings)
- **Dimensions**: 384
- **Sequence Length**: 512 tokens
- **Inference**: 100% offline, executed in-process or via ONNX Runtime without external network calls.
