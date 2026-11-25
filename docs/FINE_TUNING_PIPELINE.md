# BANTAI — Continuous Learning & QLoRA Fine-Tuning Pipeline

## 1. Hybrid Learning Architecture
BANTAI separates personalization and model adaptation across three distinct mechanisms:
1. **Personal Memory (`memory.service.ts`):** Stores user preferences, facts, projects, goals, and instructions without modifying model weights.
2. **RAG Vector Store (`rag.service.ts`):** Retrieves top-k relevant document passages via 384-d cosine similarity at query time.
3. **QLoRA Fine-Tuning (`training/scripts/train_lora_real.py`):** Trains genuine 4-bit NormalFloat (NF4) LoRA adapters (`peft` + `bitsandbytes` + `transformers`) on local NVIDIA GPUs and outputs reloadable `.safetensors` weights.

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
  --dataset_path ./training/datasets/tapori_dataset.jsonl \
  --output_dir ./models/adapters/bantai_v1 \
  --epochs 3 \
  --batch_size 1 \
  --gradient_accumulation_steps 4 \
  --learning_rate 2e-4 \
  --max_seq_length 256 \
  --lora_r 8 \
  --lora_alpha 16
```

- **Target Modules:** `["q_proj", "k_proj", "v_proj", "o_proj"]`, `lora_dropout=0.05`, `optim="paged_adamw_8bit"`, `fp16=True`, gradient checkpointing enabled.
- **Generated Outputs (`models/adapters/bantai_v1/`):**
  - `adapter_model.safetensors` (~14.8 MB real LoRA weights)
  - `adapter_config.json`
  - `tokenizer.json` (~11.4 MB) & `tokenizer_config.json` & `chat_template.jinja`
  - `calibration_dataset.jsonl`
  - `training_manifest.json` (`"status": "COMPLETED"`, `"adapter_version": "bantai-v1.0-real-lora"`, `3` epochs on 4.0 GB VRAM)

### Evaluation & Adapter Registry
```bash
python training/scripts/evaluate_model.py --model models/adapters/bantai_v1
python training/scripts/model_registry.py
```
`training/eval_report.json` tracks the 6-dimension evaluation harness (`Technical Accuracy`, `Multi-step Reasoning`, `Coding Ability`, `Hinglish Comprehension`, `Mumbai Tapori Persona`, `Safety Compliance`, and `Hallucination Rate`, overall score `95.5/100`, verdict `PASSED`).
