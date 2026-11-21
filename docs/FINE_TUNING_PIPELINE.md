# BANTAI — Continuous Learning & LoRA Fine-Tuning Pipeline

## 1. Hybrid Learning Architecture
BANTAI clearly delineates three distinct personalization and learning mechanisms:
1. **Personal Memory**: Stores individual facts, preferences, and project context in isolated databases without modifying weights.
2. **RAG (Retrieval-Augmented Generation)**: Retrieves relevant document chunks dynamically at query time without modifying weights.
3. **LoRA Fine-Tuning**: Periodically updates parameter adapters (`r=16, alpha=32`) using approved, PII-scrubbed datasets from opted-in users.

---

## 2. Strict Opt-In Consent Policy
- **Default State**: Cross-user model training is **STRICTLY DISABLED BY DEFAULT**.
- **Separate Permissions**: Personal memory and model training toggles are completely decoupled.
- **Audit Logging**: Every consent decision logs an immutable timestamp, policy version, and withdrawal timestamp.
- **Data Provenance**: If a user withdraws consent, their eligible examples are excluded from future training builds.

---

## 3. Training Pipeline Workflow

```
[User Chat Feedback] 
       |
       v
[Consent Check] ---> (Opt-In == false? Discard immediately)
       | (Opt-In == true)
       v
[PII Scrubber]  ---> (Redact Emails, Phone Numbers, API Tokens)
       |
       v
[Quality Filter] ---> (Threshold >= 0.7 score)
       |
       v
[Dataset Versioning] -> (Generate train.jsonl, val.jsonl, test.jsonl)
       |
       v
[LoRA / QLoRA Training Engine: train_lora.py]
       |
       v
[Benchmark Evaluation: evaluate_model.py]
       |
       v
[Model Registry & Deployment: model_registry.py]
```

---

## 4. Running the Pipeline

### Step 1: Install Dependencies
```bash
pip install -r training/requirements.txt
```

### Step 2: Export Approved Dataset Splits
```bash
curl -X POST http://localhost:4000/api/learning/export-dataset \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

### Step 3: Run LoRA Fine-Tuning
```bash
python training/scripts/train_lora.py \
  --base_model Qwen/Qwen2.5-7B-Instruct \
  --dataset_path data/learning_datasets/approved_examples_buffer.jsonl \
  --output_dir models/adapters/bantai_v1 \
  --epochs 3 \
  --batch_size 2 \
  --lora_r 16 \
  --qlora
```

### Step 4: Evaluate the Adapter Against Baseline
```bash
python training/scripts/evaluate_model.py --model models/adapters/bantai_v1
```

### Step 5: Register and Deploy Adapter
```bash
python training/scripts/model_registry.py
```
