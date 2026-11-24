#!/usr/bin/env python3
"""
BANTAI Real LoRA / QLoRA Training Engine
Fine-tunes Qwen2.5 on NVIDIA RTX GPUs (optimized for 4GB VRAM with 4-bit NF4 quantization)
Generates actual reloadable LoRA adapter weights (.safetensors)
"""

import os
import sys
import json
import argparse
from datetime import datetime, timezone

def parse_args():
    parser = argparse.ArgumentParser(description="BANTAI Genuine LoRA / QLoRA Training Engine")
    parser.add_argument("--base_model", type=str, default="Qwen/Qwen2.5-3B-Instruct", help="Hugging Face foundation model ID")
    parser.add_argument("--dataset_path", type=str, default="./training/datasets/tapori_dataset.jsonl", help="Path to JSONL dataset")
    parser.add_argument("--output_dir", type=str, default="./training/models/adapters/bantai_v1", help="Output directory for LoRA adapter weights")
    parser.add_argument("--epochs", type=int, default=3, help="Training epochs")
    parser.add_argument("--batch_size", type=int, default=1, help="Per device batch size (1 for 4GB VRAM)")
    parser.add_argument("--gradient_accumulation_steps", type=int, default=4, help="Gradient accumulation steps")
    parser.add_argument("--learning_rate", type=float, default=2e-4, help="Learning rate")
    parser.add_argument("--max_seq_length", type=int, default=256, help="Max sequence length for 4GB VRAM safety")
    parser.add_argument("--lora_r", type=int, default=8, help="LoRA rank dimension")
    parser.add_argument("--lora_alpha", type=int, default=16, help="LoRA alpha scaling factor")
    return parser.parse_args()

def main():
    args = parse_args()
    print("=" * 65)
    print("  BANTAI GENUINE LoRA / QLoRA FINE-TUNING PIPELINE")
    print("  Tagline: Apna Model. Apna Dimaag. Apna AI.")
    print("=" * 65)
    print(f"[*] Base Foundation Model : {args.base_model}")
    print(f"[*] Input Dataset Path    : {args.dataset_path}")
    print(f"[*] Adapter Output Target : {args.output_dir}")
    print(f"[*] Hyperparameters       : epochs={args.epochs}, lr={args.learning_rate}, seq_len={args.max_seq_length}")
    print("-" * 65)

    os.makedirs(args.output_dir, exist_ok=True)

    # 1. Hardware Verification
    import torch
    if not torch.cuda.is_available():
        print("[!] Error: CUDA is not available. GPU is required for QLoRA training.")
        sys.exit(1)
    
    gpu_name = torch.cuda.get_device_name(0)
    total_vram_gb = round(torch.cuda.get_device_properties(0).total_memory / (1024**3), 2)
    print(f"[1/5] Compute Target: {gpu_name} ({total_vram_gb} GB VRAM)")

    # 2. Load Dataset
    print(f"[2/5] Loading training dataset from {args.dataset_path}...")
    if not os.path.exists(args.dataset_path):
        print(f"[!] Dataset not found at {args.dataset_path}")
        sys.exit(1)

    with open(args.dataset_path, "r", encoding="utf-8") as f:
        data = [json.loads(line) for line in f if line.strip()]
    print(f"[*] Successfully loaded {len(data)} training examples.")

    # 3. Model & Tokenizer Initialization
    from transformers import (
        AutoTokenizer,
        AutoModelForCausalLM,
        BitsAndBytesConfig,
        TrainingArguments,
        Trainer,
        DataCollatorForSeq2Seq
    )
    from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
    from datasets import Dataset

    print(f"[3/5] Loading {args.base_model} with 4-bit NF4 quantization...")
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.float16,
        bnb_4bit_use_double_quant=True
    )

    tokenizer = AutoTokenizer.from_pretrained(args.base_model, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    model = AutoModelForCausalLM.from_pretrained(
        args.base_model,
        quantization_config=bnb_config,
        device_map="auto",
        trust_remote_code=True
    )

    model = prepare_model_for_kbit_training(model)
    model.gradient_checkpointing_enable()

    # 4. LoRA Configuration
    lora_config = LoraConfig(
        r=args.lora_r,
        lora_alpha=args.lora_alpha,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM"
    )
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    # 5. Tokenize & Format Dataset
    def format_and_tokenize(example):
        messages = example["messages"]
        text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=False)
        tokens = tokenizer(
            text,
            max_length=args.max_seq_length,
            truncation=True,
            padding="max_length"
        )
        tokens["labels"] = tokens["input_ids"].copy()
        return tokens

    hf_dataset = Dataset.from_list(data)
    tokenized_dataset = hf_dataset.map(format_and_tokenize, remove_columns=["messages"])

    # 6. Training Execution
    print("[4/5] Executing QLoRA gradient descent optimization...")
    training_args = TrainingArguments(
        output_dir=os.path.join(args.output_dir, "checkpoints"),
        per_device_train_batch_size=args.batch_size,
        gradient_accumulation_steps=args.gradient_accumulation_steps,
        learning_rate=args.learning_rate,
        num_train_epochs=args.epochs,
        logging_steps=1,
        fp16=True,
        optim="paged_adamw_8bit",
        save_strategy="no",
        report_to="none"
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_dataset,
        data_collator=DataCollatorForSeq2Seq(tokenizer, pad_to_multiple_of=8, return_tensors="pt")
    )

    train_result = trainer.train()

    # 7. Save Genuine Adapter Weights
    print(f"[5/5] Saving genuine LoRA adapter weights to {args.output_dir}...")
    model.save_pretrained(args.output_dir)
    tokenizer.save_pretrained(args.output_dir)

    manifest = {
        "status": "COMPLETED",
        "base_model": args.base_model,
        "adapter_version": "bantai-v1.0-real-lora",
        "train_loss": round(float(train_result.training_loss), 4),
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "adapter_files": os.listdir(args.output_dir),
        "vram_gb": total_vram_gb,
        "epochs": args.epochs
    }
    with open(os.path.join(args.output_dir, "training_manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    print("=" * 65)
    print(f"  SUCCESS: Real BANTAI LoRA Adapter Generated at: {args.output_dir}")
    print(f"  Final Loss: {manifest['train_loss']}")
    print("=" * 65)

if __name__ == "__main__":
    main()
