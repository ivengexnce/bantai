#!/usr/bin/env python3
"""
BANTAI Model Registry & Governance Engine
Tracks foundation models, active adapters, version lineage, evaluation scores,
and provides instantaneous one-click rollback capabilities.
"""

import os
import json
from datetime import datetime, timezone
from typing import Dict, Any, List

REGISTRY_FILE = "./models/model_registry.json"

class ModelRegistry:
    def __init__(self, registry_file: str = REGISTRY_FILE):
        self.registry_file = registry_file
        os.makedirs(os.path.dirname(self.registry_file), exist_ok=True)
        self.data = self._load()

    def _load(self) -> Dict[str, Any]:
        if os.path.exists(self.registry_file):
            try:
                with open(self.registry_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
        return {
            "active_version": "v1.0-default",
            "models": {
                "v1.0-default": {
                    "adapter_id": "bantai-v1.0-sovereign",
                    "base_model": "Qwen/Qwen2.5-3B-Instruct",
                    "status": "ACTIVE",
                    "registered_at": datetime.now(timezone.utc).isoformat(),
                    "eval_score": 0.0,
                    "dataset_version": "bantai_dataset_v2",
                    "rollback_target": None
                }
            },
            "history": []
        }

    def _save(self):
        with open(self.registry_file, "w", encoding="utf-8") as f:
            json.dump(self.data, f, indent=2)

    def register_adapter(self, version: str, base_model: str, eval_score: float, dataset_version: str):
        prev_active = self.data.get("active_version")
        self.data["models"][version] = {
            "adapter_id": f"bantai-{version}",
            "base_model": base_model,
            "status": "APPROVED",
            "registered_at": datetime.now(timezone.utc).isoformat(),
            "eval_score": eval_score,
            "dataset_version": dataset_version,
            "rollback_target": prev_active
        }
        self.data["history"].append({
            "action": "REGISTER",
            "version": version,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        self._save()
        print(f"[*] Registered model adapter version '{version}' with eval score {eval_score}%")

    def deploy_version(self, version: str):
        if version not in self.data["models"]:
            raise ValueError(f"Version '{version}' does not exist in registry.")

        old_version = self.data["active_version"]
        self.data["models"][old_version]["status"] = "ARCHIVED"
        self.data["models"][version]["status"] = "ACTIVE"
        self.data["active_version"] = version

        self.data["history"].append({
            "action": "DEPLOY",
            "from_version": old_version,
            "to_version": version,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        self._save()
        print(f"[SUCCESS] Switched active production model from '{old_version}' to '{version}'")

    def rollback(self):
        curr = self.data["active_version"]
        target = self.data["models"][curr].get("rollback_target")
        if not target or target not in self.data["models"]:
            print(f"[!] No valid rollback target available for current version '{curr}'")
            return False

        print(f"[*] Initiating rollback from '{curr}' to '{target}'...")
        self.deploy_version(target)
        self.data["history"].append({
            "action": "ROLLBACK",
            "from_version": curr,
            "to_version": target,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        self._save()
        print(f"[SUCCESS] Rollback complete. Active model is now '{target}'")
        return True

if __name__ == "__main__":
    registry = ModelRegistry()
    print("=== BANTAI MODEL REGISTRY STATUS ===")
    print(f"Active Production Model: {registry.data['active_version']}")
    print(json.dumps(registry.data["models"], indent=2))
