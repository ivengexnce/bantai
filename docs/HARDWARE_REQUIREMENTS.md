# BANTAI — Hardware & Infrastructure Requirements

BANTAI is engineered to scale cleanly from standard CPU laptops up to CUDA-accelerated local GPUs, without needing cloud GPUs.

---

## 1. Inference Hardware Tiers

### Tier 1: Minimum Viable Setup (CPU-Only / Offline Mode)
- **CPU:** 4+ Modern Cores (x86_64 AVX2 or Apple Silicon M-series)
- **RAM:** 8 - 16 GB System Memory
- **GPU:** None required (runs CPU quantized Ollama inference or zero-VRAM built-in deterministic `local_engine`)
- **Storage:** 10 - 15 GB SSD (for OS dependencies + `bantai-chhotu`)
- **Supported Model:** **BANTAI Chhotu** (`bantai-chhotu` / `qwen2.5:3b` Q4_K_M, ~1.9 GB model size)

### Tier 2: Recommended Local Workstation (Verified RTX A2000 4GB+ Setup)
- **CPU:** 8 Cores (Intel Core i7 / Ryzen 7+)
- **RAM:** 16 - 32 GB System Memory
- **GPU:** NVIDIA RTX A2000 (4 GB VRAM) / RTX 3060 / RTX 4060 / 4070
- **VRAM:** 4 GB to 12 GB GDDR6
- **Storage:** 25+ GB NVMe SSD
- **Supported Models:**
  - **BANTAI Chhotu** (`bantai-chhotu` 3B) — fits fully inside 4 GB VRAM with fast token generation
  - **BANTAI Bhai** (`bantai-bhai` 7B Q4_K_M, ~4.7 GB) — partial/full GPU offload depending on VRAM (smooth daily coding & Hinglish reasoning at 6-8 GB+ VRAM or 16 GB RAM CPU+GPU hybrid)

---

## 2. QLoRA Fine-Tuning Hardware Tiers (`train_lora_real.py`)

### Verified Consumer / Laptop GPU Profile (4 GB VRAM Minimum)
- **Tested Hardware:** NVIDIA RTX A2000 Laptop GPU (4.0 GB VRAM, CUDA enabled)
- **Peak Allocation:** ~3,860 MiB VRAM
- **Required Settings:** 4-bit NormalFloat quantization (`bitsandbytes`), `paged_adamw_8bit`, `gradient_checkpointing_enable()`, `batch_size=1`, `gradient_accumulation_steps=4`, `max_seq_length=256`, `lora_r=8`, base model `Qwen/Qwen2.5-3B-Instruct`.

### High-Throughput Workstation Profile (Optional Scaling)
- **GPU:** NVIDIA RTX 3090 / 4090 (24 GB VRAM) or A100 (40/80 GB)
- **Capabilities:** Larger batch sizes (`>= 4`), longer sequence lengths (`2048+`), higher LoRA rank (`r=16` or `32`), and direct QLoRA training of 7B+ instruction foundations.
