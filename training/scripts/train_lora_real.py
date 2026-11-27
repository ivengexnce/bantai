#!/usr/bin/env python3
"""
BANTAI Real LoRA / QLoRA Training Engine
Fine-tunes causal language models with 4-bit NF4 QLoRA on NVIDIA GPUs
(optimized for 4GB VRAM) or standard FP32 LoRA fallback on CPU (--allow_cpu).
Supports held-out validation loss (--eval_split) and optional all-linear LoRA.
"""

import argparse
import json
import os
import sys
import tempfile
from dataclasses import dataclass
from datetime import datetime, timezone


@dataclass(frozen=True)
class ComputeMode:
    """Resolved hardware and precision settings for LoRA training."""

    device: str
    gpu_name: str
    vram_gb: float
    use_4bit: bool
    use_bf16: bool
    use_fp16: bool
    precision: str


def parse_args() -> argparse.Namespace:
    """Parse and validate CLI arguments for LoRA fine-tuning."""
    parser = argparse.ArgumentParser(description="BANTAI Genuine LoRA / QLoRA Training Engine")
    parser.add_argument("--base_model", type=str, default="Qwen/Qwen2.5-3B-Instruct", help="Hugging Face model ID or local model path")
    parser.add_argument("--dataset_path", type=str, default="./training/datasets/bantai_dataset.jsonl", help="Path to JSONL dataset")
    parser.add_argument("--output_dir", type=str, default="./models/adapters/bantai_v1", help="Output directory for LoRA adapter weights")
    parser.add_argument("--epochs", type=int, default=8, help="Training epochs")
    parser.add_argument("--batch_size", type=int, default=1, help="Per-device batch size (1 for 4GB VRAM)")
    parser.add_argument("--gradient_accumulation_steps", type=int, default=2, help="Gradient accumulation steps")
    parser.add_argument("--learning_rate", type=float, default=2e-4, help="Learning rate")
    parser.add_argument("--max_seq_length", type=int, default=320, help="Max sequence length for 4GB VRAM safety")
    parser.add_argument("--lora_r", type=int, default=8, help="LoRA rank dimension")
    parser.add_argument("--lora_alpha", type=int, default=16, help="LoRA alpha scaling factor")
    parser.add_argument("--eval_split", type=float, default=0.15, help="Fraction of dataset reserved for held-out validation (0.0 disables)")
    parser.add_argument("--all_linear", action="store_true", help="Attach LoRA adapters to MLP projections (gate/up/down) alongside attention layers")
    parser.add_argument("--allow_cpu", action="store_true", help="Fallback to FP32 LoRA training when CUDA is unavailable")
    args = parser.parse_args()

    if args.epochs < 1 or args.batch_size < 1 or args.gradient_accumulation_steps < 1:
        parser.error("--epochs, --batch_size, and --gradient_accumulation_steps must be >= 1.")
    if args.max_seq_length < 16:
        parser.error("--max_seq_length must be >= 16.")
    if args.lora_r < 1 or args.lora_alpha < 1 or args.learning_rate <= 0:
        parser.error("--lora_r, --lora_alpha must be >= 1 and --learning_rate must be > 0.")
    if args.eval_split < 0.0 or args.eval_split >= 0.5:
        parser.error("--eval_split must be in [0.0, 0.5).")
    return args


def resolve_compute_mode(allow_cpu: bool) -> ComputeMode:
    """Detect CUDA availability and select safe compute precision."""
    import torch

    if torch.cuda.is_available():
        gpu_name = torch.cuda.get_device_name(0)
        total_vram_gb = round(torch.cuda.get_device_properties(0).total_memory / (1024**3), 2)
        major_cc, _ = torch.cuda.get_device_capability(0)
        use_bf16 = major_cc >= 8 and torch.cuda.is_bf16_supported()
        return ComputeMode(
            device="cuda",
            gpu_name=gpu_name,
            vram_gb=total_vram_gb,
            use_4bit=True,
            use_bf16=use_bf16,
            use_fp16=not use_bf16,
            precision="bf16" if use_bf16 else "fp16",
        )

    if not allow_cpu:
        print(f"[!] Error: CUDA is not available in {sys.executable} (torch {torch.__version__}).")
        print("[!] QLoRA requires a CUDA-enabled PyTorch build, or re-run with --allow_cpu.")
        sys.exit(1)

    return ComputeMode(
        device="cpu",
        gpu_name="CPU (FP32 LoRA fallback)",
        vram_gb=0.0,
        use_4bit=False,
        use_bf16=False,
        use_fp16=False,
        precision="fp32",
    )


def load_training_examples(dataset_path: str) -> list[dict]:
    """Load and validate JSONL chat examples, normalizing extra metadata columns."""
    if not os.path.isfile(dataset_path):
        print(f"[!] Dataset file not found at {dataset_path}")
        sys.exit(1)

    examples = []
    with open(dataset_path, "r", encoding="utf-8") as f:
        for line_num, raw_line in enumerate(f, start=1):
            stripped = raw_line.strip()
            if not stripped:
                continue
            try:
                record = json.loads(stripped)
            except json.JSONDecodeError as exc:
                print(f"[!] Invalid JSON on line {line_num} of {dataset_path}: {exc}")
                sys.exit(1)

            messages = record.get("messages") if isinstance(record, dict) else None
            if not isinstance(messages, list) or not messages:
                print(f"[!] Invalid example on line {line_num}: expected non-empty 'messages' list.")
                sys.exit(1)

            for msg in messages:
                if not isinstance(msg, dict) or not isinstance(msg.get("role"), str) or not isinstance(msg.get("content"), str):
                    print(f"[!] Invalid message on line {line_num}: each message must have string 'role' and 'content'.")
                    sys.exit(1)

            examples.append({"messages": messages})

    if not examples:
        print(f"[!] Dataset at {dataset_path} contains 0 valid training examples.")
        sys.exit(1)
    return examples


def render_chat_text(tokenizer, messages: list[dict], add_generation_prompt: bool = False) -> str:
    """Format conversation turns with the tokenizer's chat template or a safe fallback."""
    if not messages:
        return ""
    if getattr(tokenizer, "chat_template", None):
        return tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=add_generation_prompt,
        )

    rendered = "".join(f"<|{m['role']}|>\n{m['content']}\n" for m in messages)
    if add_generation_prompt:
        rendered += "<|assistant|>\n"
    return rendered


def common_prefix_len(a: list[int], b: list[int]) -> int:
    """Return number of leading token IDs identical between sequences a and b."""
    limit = min(len(a), len(b))
    idx = 0
    while idx < limit and a[idx] == b[idx]:
        idx += 1
    return idx


def build_tokenize_fn(tokenizer, max_seq_length: int):
    """Create a dataset map function with dynamic padding and assistant-only label masking."""

    def format_and_tokenize(example: dict) -> dict:
        messages = example["messages"]
        full_text = render_chat_text(tokenizer, messages, add_generation_prompt=False)
        tokens = tokenizer(
            full_text,
            max_length=max_seq_length,
            truncation=True,
            padding=False,
        )
        input_ids = tokens["input_ids"]
        assistant_indices = [i for i, m in enumerate(messages) if m["role"] == "assistant"]

        if not assistant_indices:
            tokens["labels"] = input_ids.copy()
            return tokens

        labels = [-100] * len(input_ids)
        for idx in assistant_indices:
            prompt_text = render_chat_text(tokenizer, messages[:idx], add_generation_prompt=True)
            upto_text = render_chat_text(tokenizer, messages[: idx + 1], add_generation_prompt=False)

            prompt_ids = tokenizer(prompt_text, truncation=False)["input_ids"] if prompt_text else []
            upto_ids = tokenizer(upto_text, truncation=False)["input_ids"]

            start = common_prefix_len(prompt_ids, input_ids) if prompt_ids else 0
            end = common_prefix_len(upto_ids, input_ids)
            for pos in range(start, end):
                labels[pos] = input_ids[pos]

        tokens["labels"] = labels
        return tokens

    return format_and_tokenize


def prepare_dataset(tokenizer, raw_examples: list[dict], max_seq_length: int, eval_split: float):
    """Tokenize chat examples, mask prompts, filter truncated rows, and split train/val."""
    from datasets import Dataset

    hf_dataset = Dataset.from_list(raw_examples)
    tokenize_fn = build_tokenize_fn(tokenizer, max_seq_length)
    tokenized = hf_dataset.map(tokenize_fn, remove_columns=hf_dataset.column_names)

    valid = tokenized.filter(lambda row: any(lbl != -100 for lbl in row["labels"]))
    dropped = len(tokenized) - len(valid)
    if dropped > 0:
        print(f"[!] Warning: Dropped {dropped} example(s) truncated before assistant output.")
    if len(valid) == 0:
        print("[!] Error: 0 trainable examples remain after tokenization/truncation.")
        sys.exit(1)

    if eval_split > 0.0 and len(valid) >= 5:
        split = valid.train_test_split(test_size=eval_split, seed=42)
        return split["train"], split["test"]
    return valid, None


def load_model_and_tokenizer(args: argparse.Namespace, compute_mode: ComputeMode):
    """Initialize tokenizer, base causal LM (4-bit QLoRA on CUDA or FP32 on CPU), and LoRA adapter."""
    import torch
    from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
    from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig

    tokenizer = AutoTokenizer.from_pretrained(args.base_model, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    tokenizer.padding_side = "right"

    if compute_mode.use_4bit:
        print(f"[3/5] Loading {args.base_model} with 4-bit NF4 quantization ({compute_mode.precision})...")
        compute_dtype = torch.bfloat16 if compute_mode.use_bf16 else torch.float16
        bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=compute_dtype,
            bnb_4bit_use_double_quant=True,
        )
        model = AutoModelForCausalLM.from_pretrained(
            args.base_model,
            quantization_config=bnb_config,
            device_map="auto",
            trust_remote_code=True,
        )
        model.config.use_cache = False
        model = prepare_model_for_kbit_training(
            model,
            use_gradient_checkpointing=True,
            gradient_checkpointing_kwargs={"use_reentrant": False},
        )
    else:
        print(f"[3/5] Loading {args.base_model} in FP32 CPU fallback mode...")
        model = AutoModelForCausalLM.from_pretrained(args.base_model, trust_remote_code=True)
        model.config.use_cache = False

    target_modules = ["q_proj", "k_proj", "v_proj", "o_proj"]
    if args.all_linear:
        target_modules.extend(["gate_proj", "up_proj", "down_proj"])

    lora_config = LoraConfig(
        r=args.lora_r,
        lora_alpha=args.lora_alpha,
        target_modules=target_modules,
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
    )
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()
    return model, tokenizer


def main():
    args = parse_args()
    print("=" * 65)
    print("  BANTAI GENUINE LoRA / QLoRA FINE-TUNING PIPELINE")
    print("  Tagline: Apna Model. Apna Dimaag. Apna AI.")
    print("=" * 65)
    print(f"[*] Base Foundation Model : {args.base_model}")
    print(f"[*] Input Dataset Path    : {args.dataset_path}")
    print(f"[*] Adapter Output Target : {args.output_dir}")
    print(f"[*] Hyperparameters       : epochs={args.epochs}, lr={args.learning_rate}, seq_len={args.max_seq_length}, all_linear={args.all_linear}")
    print("-" * 65)

    compute_mode = resolve_compute_mode(allow_cpu=args.allow_cpu)
    print(f"[1/5] Compute Target: {compute_mode.gpu_name} ({compute_mode.vram_gb} GB VRAM, {compute_mode.precision})")

    print(f"[2/5] Loading training dataset from {args.dataset_path}...")
    raw_examples = load_training_examples(args.dataset_path)
    print(f"[*] Successfully loaded {len(raw_examples)} training examples.")

    model, tokenizer = load_model_and_tokenizer(args, compute_mode)
    train_dataset, eval_dataset = prepare_dataset(tokenizer, raw_examples, args.max_seq_length, args.eval_split)
    print(f"[*] Prepared splits: train={len(train_dataset)}, val={len(eval_dataset) if eval_dataset else 0}")

    from transformers import DataCollatorForSeq2Seq, Trainer, TrainingArguments

    print("[4/5] Executing LoRA gradient descent optimization...")
    with tempfile.TemporaryDirectory(prefix="bantai_ckpt_") as tmp_ckpt_dir:
        has_eval = eval_dataset is not None
        training_args = TrainingArguments(
            output_dir=tmp_ckpt_dir,
            per_device_train_batch_size=args.batch_size,
            per_device_eval_batch_size=args.batch_size,
            gradient_accumulation_steps=args.gradient_accumulation_steps,
            learning_rate=args.learning_rate,
            num_train_epochs=args.epochs,
            logging_steps=1,
            eval_strategy="epoch" if has_eval else "no",
            bf16=compute_mode.use_bf16,
            fp16=compute_mode.use_fp16,
            use_cpu=(compute_mode.device == "cpu"),
            optim="paged_adamw_8bit" if compute_mode.use_4bit else "adamw_torch",
            save_strategy="no",
            report_to="none",
            remove_unused_columns=False,
        )

        trainer = Trainer(
            model=model,
            args=training_args,
            train_dataset=train_dataset,
            eval_dataset=eval_dataset,
            processing_class=tokenizer,
            data_collator=DataCollatorForSeq2Seq(
                tokenizer,
                pad_to_multiple_of=8,
                label_pad_token_id=-100,
                return_tensors="pt",
            ),
        )
        train_result = trainer.train()
        eval_metrics = trainer.evaluate() if has_eval else {}

    os.makedirs(args.output_dir, exist_ok=True)
    print(f"[5/5] Saving genuine LoRA adapter weights to {args.output_dir}...")
    model.save_pretrained(args.output_dir)
    tokenizer.save_pretrained(args.output_dir)

    adapter_files = sorted(
        f for f in os.listdir(args.output_dir) if os.path.isfile(os.path.join(args.output_dir, f))
    )
    manifest = {
        "status": "COMPLETED",
        "base_model": args.base_model,
        "adapter_version": "bantai-v2.0-sovereign",
        "train_loss": round(float(train_result.training_loss), 4),
        "eval_loss": round(float(eval_metrics["eval_loss"]), 4) if "eval_loss" in eval_metrics else None,
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "adapter_files": adapter_files,
        "vram_gb": compute_mode.vram_gb,
        "device": compute_mode.device,
        "precision": compute_mode.precision,
        "train_examples": len(train_dataset),
        "val_examples": len(eval_dataset) if eval_dataset else 0,
        "epochs": args.epochs,
        "all_linear": args.all_linear,
    }
    with open(os.path.join(args.output_dir, "training_manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    print("=" * 65)
    print(f"  SUCCESS: Real BANTAI LoRA Adapter Generated at: {args.output_dir}")
    print(f"  Train Loss: {manifest['train_loss']} | Eval Loss: {manifest['eval_loss']}")
    print("=" * 65)


if __name__ == "__main__":
    main()
