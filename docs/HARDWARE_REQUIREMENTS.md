# BANTAI — Hardware & Infrastructure Requirements

## 1. Inference Hardware Tiers

### Tier 1: Minimum Viable Setup (CPU Only / Quantized)
- **CPU**: 4+ Modern Cores (x86_64 or Apple Silicon M-series)
- **RAM**: 16 GB DDR4/DDR5
- **GPU**: None (CPU AVX2 execution via llama.cpp / Ollama)
- **Storage**: 20 GB SSD
- **Supported Models**: `qwen2.5:7b` (Q4_K_M quantization), `llama3.1:8b` (Q4_0)
- **Speed**: ~8 - 14 tokens/second

### Tier 2: Recommended Production Setup (Single GPU)
- **CPU**: 8 Cores (Intel Core i7/i9 or AMD Ryzen 7/9)
- **RAM**: 32 GB RAM
- **GPU**: NVIDIA RTX 3060 (12GB) / RTX 4070 / RTX 4080 (16GB) or A10G (24GB)
- **VRAM**: 8 GB to 16 GB GDDR6
- **Storage**: 50 GB NVMe SSD
- **Supported Models**: `qwen2.5:7b` (FP16 / Q8), `llama3.1:8b` (FP16), `qwen2.5:14b` (Q4_K_M)
- **Speed**: ~45 - 80 tokens/second

### Tier 3: Enterprise & Training Cluster (LoRA Fine-Tuning)
- **CPU**: 16+ Cores AMD EPYC / Intel Xeon
- **RAM**: 64 GB+ System Memory
- **GPU**: 1x or 2x NVIDIA A100 (40GB/80GB) or RTX 4090 (24GB)
- **Storage**: 200 GB+ High-Speed NVMe SSD
- **Capabilities**: Full QLoRA/LoRA fine-tuning of 7B to 32B models with batch size >= 4.
