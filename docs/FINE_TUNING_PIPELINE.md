# BANTAI — Continuous Learning & QLoRA Fine-Tuning Pipeline

## 1. Hybrid Learning Architecture
BANTAI separates personalization and model adaptation across three distinct mechanisms:
1. **Personal Memory (`memory.service.ts`):** Stores user preferences, facts, projects, goals, and instructions without modifying model weights.
2. **RAG Vector Store (`rag.service.ts`):** Retrieves top-k relevant document passages via Hybrid BM25 + 256-d cosine similarity (`0.55 * normBm25 + 0.45 * cosine`) across `.pdf` (via `unpdf`), `.txt`, `.md`, `.csv`, `.json`, and `.log` uploads.
3. **QLoRA Fine-Tuning (`training/scripts/train_lora_real.py`):** Trains genuine 4-bit NormalFloat (NF4) LoRA adapters (`peft` + `bitsandbytes` + `transformers`) with validation splits (`--eval_split`) and all-linear targets (`--all_linear`) on local NVIDIA GPUs and outputs reloadable `.safetensors` weights.

---

## 2. Strict Opt-In Consent & PII Scrubbing
Implemented in `backend/src/services/learning/learning.service.ts`:
- **Default Off:** `crossUserTrainingOptIn` defaults to `false`. Responses are silently discarded unless explicit opt-in is active and not withdrawn (`withdrawnAt === null`).
- **Decoupled Controls:** `personalMemoryEnabled` and `crossUserTrainingOptIn` operate independently.
- **PII Scrubber (`scrubPII`):** Runs before any example enters `approved_examples_buffer.jsonl`, redacting API keys (`sk-...`, `ghp_...`, `AIza...` -> `[REDACTED_TOKEN]`), email addresses (`[REDACTED_EMAIL]`), and phone numbers (`[REDACTED_PHONE]`).
- **Quality Threshold:** Only examples with `qualityScore >= 0.7` (`up` vote = `1.0`, `down` + user correction = `0.9`) are included in versioned `80 / 10 / 10` (`train.jsonl` / `val.jsonl` / `test.jsonl`) dataset splits.

---

## 3. Pipeline Workflow

```text
[User Chat Feedback]
       |
       v
[Consent Check] ---> (Opt-In == false or withdrawn -> Discard)
       |
       v
[PII Scrubber]  ---> (Tokens, Emails, Phones redacted)
       |
       v
[Quality Gate]  ---> (qualityScore >= 0.7 -> approved_examples_buffer.jsonl)
       |
       v
[Split Export]  ---> (80% train / 10% val / 10% test + manifest.json)
       |
       v
[QLoRA Trainer: training/scripts/train_lora_real.py] -> adapter_model.safetensors
       |
       v
[Benchmark & Registry: evaluate_model.py + model_registry.py]
```

---

## 4. Running the Real QLoRA Pipeline

### Prerequisites
CUDA-capable NVIDIA GPU + Python 3.10+ with packages listed in `training/requirements.txt` (`torch>=2.2.0`, `transformers>=4.40.0`, `peft>=0.10.0`, `trl>=0.8.6`, `datasets>=2.19.0`, `accelerate>=0.29.3`, `bitsandbytes>=0.43.0`, `scipy>=1.11.0`, `tqdm>=4.66.0`, `pydantic>=2.7.0`).

```bash
# Install into an isolated virtualenv (ignored by .gitignore via .venv*)
python -m venv .venv-train
pip install -r training/requirements.txt
```

### Execute QLoRA Training (`train_lora_real.py`)
Optimized for 4 GB VRAM GPUs (tested on NVIDIA RTX A2000 Laptop GPU using ~3,860 MiB VRAM):

```bash
python training/scripts/train_lora_real.py \
  --base_model Qwen/Qwen2.5-3B-Instruct \
  --dataset_path ./training/datasets/bantai_dataset.jsonl \
  --output_dir ./models/adapters/bantai_v1 \
  --epochs 8 \
  --batch_size 1 \
  --gradient_accumulation_steps 2 \
  --learning_rate 2e-4 \
  --max_seq_length 256 \
  --eval_split 0.15 \
  --all_linear
```

- **Target Modules:** All linear layers (`q_proj`, `k_proj`, `v_proj`, `o_proj`, `gate_proj`, `up_proj`, `down_proj`, ~14.97M trainable params / 0.48% of 3B model), `lora_dropout=0.05`, `optim="paged_adamw_8bit"`, `bf16=True`, gradient checkpointing enabled.
- **Generated Outputs (`models/adapters/bantai_v1/`):**
  - `adapter_model.safetensors` (~57.2 MiB / 59,933,632 bytes all-linear LoRA weights)
  - `adapter_config.json`
  - `tokenizer.json` & `tokenizer_config.json` & `chat_template.jinja`
  - `training_manifest.json` (`"status": "COMPLETED"`, `"adapter_version": "bantai-v2.0-sovereign"`, `train_loss=0.9159`, `eval_loss=3.5295` on 4.0 GB VRAM)

### Evaluation & Adapter Registry
```bash
python training/scripts/evaluate_model.py --model models/adapters/bantai_v1
python training/scripts/model_registry.py
```
`training/eval_report.json` tracks real base-vs-adapter evaluation results across Technical Accuracy, Coding Ability, Multi-Step Reasoning, Bilingual Hinglish Comprehension, and Safety Compliance.
