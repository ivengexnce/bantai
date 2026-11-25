'use client';

import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../lib/api';
import { AIModelDescriptor, FirestoreMemory, FirestoreTask } from '@bantai/shared';
import {
  Sparkles,
  Cpu,
  Database,
  Brain,
  MessageSquare,
  CheckSquare,
  ShieldCheck,
  Terminal,
  Check,
  AlertCircle,
  Loader2,
  Download
} from 'lucide-react';

interface LearningStatusState {
  crossUserTrainingOptIn: boolean;
  personalMemoryEnabled: boolean;
  consentTimestamp: string | null;
  policyVersion: string;
  inferenceBackend: {
    provider: string;
    isAlive: boolean;
    availableModels: string[];
  };
}

export function FineTuneView() {
  const {
    user,
    setUser,
    conversations,
    selectedModel,
    setSelectedModel
  } = useApp();

  const [status, setStatus] = useState<LearningStatusState | null>(null);
  const [models, setModels] = useState<AIModelDescriptor[]>([]);
  const [memories, setMemories] = useState<FirestoreMemory[]>([]);
  const [tasks, setTasks] = useState<FirestoreTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingConsent, setSavingConsent] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const consentEnabled = user?.learningConsent?.crossUserTrainingOptIn ?? status?.crossUserTrainingOptIn ?? false;

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.allSettled([
      api.getLearningStatus(),
      api.getModels(),
      api.getMemories(),
      api.getTasks()
    ]).then(([stRes, modRes, memRes, taskRes]) => {
      if (!active) return;
      if (stRes.status === 'fulfilled') setStatus(stRes.value);
      if (modRes.status === 'fulfilled') setModels(modRes.value.supportedModels || []);
      if (memRes.status === 'fulfilled') setMemories(memRes.value || []);
      if (taskRes.status === 'fulfilled') setTasks(taskRes.value || []);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const handleToggleConsent = async () => {
    setErrorMsg(null);
    setSavingConsent(true);
    const next = !consentEnabled;
    try {
      const updated = await api.updateConsent({ crossUserTrainingOptIn: next });
      setUser(updated);
      setStatus(prev =>
        prev
          ? {
              ...prev,
              crossUserTrainingOptIn: updated.learningConsent.crossUserTrainingOptIn,
              consentTimestamp: updated.learningConsent.consentTimestamp
            }
          : prev
      );
    } catch (err) {
      setErrorMsg((err as Error).message || 'Failed to update training opt-in consent.');
    } finally {
      setSavingConsent(false);
    }
  };

  const handleSelectModel = async (modelId: string) => {
    setErrorMsg(null);
    setSelectedModel(modelId);
  };

  const handleAdminExport = async () => {
    setErrorMsg(null);
    setExportMessage(null);
    try {
      const data = await api.exportDataset();
      setExportMessage(data.message || `Prepared ${data.recordCount} anonymized opt-in records.`);
    } catch (err) {
      setErrorMsg((err as Error).message || 'Dataset export failed.');
    }
  };

  const backendInfo = status?.inferenceBackend;
  const availableOllamaModels = backendInfo?.availableModels || [];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#07070f] text-white p-4 sm:p-6 overflow-y-auto">
      <div className="max-w-5xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={18} className="text-[#22d3ee]" />
              <h2 className="text-base font-bold text-white tracking-tight">
                Model Telemetry &amp; Sovereign LoRA Governance
              </h2>
            </div>
            <p className="text-xs text-[#64748b]">
              Live runtime telemetry, local Qwen weights registry, and strict consent controls for offline LoRA training.
            </p>
          </div>

          <div className="telemetry-chip shrink-0">
            <Cpu size={12} className="text-[#6366f1]" />
            <span>
              {loading
                ? 'Checking Engine...'
                : `${backendInfo?.provider || 'local'} · ${backendInfo?.isAlive ? 'Online' : 'Fallback'}`}
            </span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#fca5a5] text-xs flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {exportMessage && (
          <div className="p-3 rounded-xl bg-[#10b981]/10 border border-[#10b981]/30 text-[#6ee7b7] text-xs flex items-center gap-2">
            <ShieldCheck size={15} className="shrink-0" />
            <span>{exportMessage}</span>
          </div>
        )}

        {/* Live Telemetry Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="surface-raised p-4 space-y-1.5">
            <div className="flex items-center justify-between text-[#64748b]">
              <span className="text-[11px] font-mono uppercase">Conversations</span>
              <MessageSquare size={14} className="text-[#6366f1]" />
            </div>
            <p className="text-2xl font-bold text-white">{conversations.length}</p>
            <p className="text-[11px] text-[#94a3b8]">Stored per-user in isolated store</p>
          </div>

          <div className="surface-raised p-4 space-y-1.5">
            <div className="flex items-center justify-between text-[#64748b]">
              <span className="text-[11px] font-mono uppercase">Memories</span>
              <Brain size={14} className="text-[#22d3ee]" />
            </div>
            <p className="text-2xl font-bold text-white">{loading ? '...' : memories.length}</p>
            <p className="text-[11px] text-[#94a3b8]">Personal facts &amp; instructions</p>
          </div>

          <div className="surface-raised p-4 space-y-1.5">
            <div className="flex items-center justify-between text-[#64748b]">
              <span className="text-[11px] font-mono uppercase">Tasks Tracked</span>
              <CheckSquare size={14} className="text-[#10b981]" />
            </div>
            <p className="text-2xl font-bold text-white">{loading ? '...' : tasks.length}</p>
            <p className="text-[11px] text-[#94a3b8]">
              {tasks.filter(t => t.status === 'completed').length} completed
            </p>
          </div>

          <div className="surface-raised p-4 space-y-1.5">
            <div className="flex items-center justify-between text-[#64748b]">
              <span className="text-[11px] font-mono uppercase">Daemon Models</span>
              <Database size={14} className="text-[#f59e0b]" />
            </div>
            <p className="text-2xl font-bold text-white">{loading ? '...' : availableOllamaModels.length}</p>
            <p className="text-[11px] text-[#94a3b8] truncate">
              {availableOllamaModels.length > 0 ? availableOllamaModels.join(', ') : 'Fallback engine active'}
            </p>
          </div>
        </div>

        {/* Strict Cross-User Training Opt-In Consent */}
        <div className="surface-raised p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-[#10b981]" />
                <h3 className="text-sm font-bold text-white">Cross-User LoRA Dataset Opt-In</h3>
              </div>
              <p className="text-xs text-[#94a3b8] max-w-2xl">
                Disabled by default. When enabled, PII-redacted DPO feedback samples may be included in local{' '}
                <code className="text-[#22d3ee]">bantai_v1</code> adapter builds.
              </p>
              <div className="flex flex-wrap gap-3 text-[11px] font-mono text-[#64748b] pt-1">
                <span>Policy: {status?.policyVersion || 'v1.0.0'}</span>
                <span>
                  Updated:{' '}
                  {user?.learningConsent?.consentTimestamp
                    ? new Date(user.learningConsent.consentTimestamp).toLocaleString()
                    : 'Not opted in'}
                </span>
              </div>
            </div>

            <button
              type="button"
              disabled={savingConsent}
              onClick={handleToggleConsent}
              aria-pressed={consentEnabled}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all shrink-0 flex items-center gap-2 ${
                consentEnabled
                  ? 'bg-[#10b981]/15 border-[#10b981]/40 text-[#10b981]'
                  : 'bg-[#07070f] border-white/10 text-[#94a3b8] hover:text-white'
              }`}
            >
              {savingConsent && <Loader2 size={13} className="animate-spin" />}
              <span>{consentEnabled ? 'Opt-In Enabled' : 'Opted Out (Private)'}</span>
            </button>
          </div>
        </div>

        {/* Supported Local Models Registry */}
        <div className="space-y-3">
          <h3 className="text-xs font-mono uppercase tracking-wider text-[#64748b]">
            Supported Local Inference Models ({models.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {models.map(m => {
              const isSelected = selectedModel === m.id;
              const isLoaded = availableOllamaModels.some(avail =>
                avail.toLowerCase().includes(m.baseModel.toLowerCase()) ||
                avail.toLowerCase().includes(m.id.toLowerCase())
              );

              return (
                <div
                  key={m.id}
                  className={`surface-raised p-4 space-y-3 border ${
                    isSelected ? 'border-[#6366f1]/60' : 'border-white/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{m.displayName}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#22d3ee]/10 text-[#22d3ee]">
                          {m.parameters}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-[#64748b] mt-0.5">{m.baseModel}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSelectModel(m.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 ${
                        isSelected
                          ? 'bg-[#6366f1] text-white'
                          : 'bg-white/5 hover:bg-white/10 text-[#94a3b8] hover:text-white'
                      }`}
                    >
                      {isSelected && <Check size={12} />}
                      <span>{isSelected ? 'Active' : 'Use Model'}</span>
                    </button>
                  </div>

                  <p className="text-xs text-[#94a3b8]">{m.description}</p>

                  <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] font-mono">
                    <div className="p-2 rounded-lg bg-[#07070f] border border-white/5">
                      <span className="block text-[10px] text-[#64748b]">RAM</span>
                      <span className="text-white">{m.ramRequirement}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-[#07070f] border border-white/5">
                      <span className="block text-[10px] text-[#64748b]">VRAM</span>
                      <span className="text-white">{m.vramRequirement}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-[#07070f] border border-white/5">
                      <span className="block text-[10px] text-[#64748b]">Runtime</span>
                      <span className={isLoaded ? 'text-[#10b981]' : 'text-[#94a3b8]'}>
                        {isLoaded ? 'Loaded' : 'On-demand'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Offline LoRA Training CLI Reference & Admin Export */}
        <div className="surface-raised p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Terminal size={16} className="text-[#6366f1]" />
              <h3 className="text-sm font-bold text-white">Local QLoRA Training Pipeline</h3>
            </div>

            {user?.role === 'admin' && (
              <button
                type="button"
                onClick={handleAdminExport}
                className="px-3 py-1.5 rounded-lg bg-[#22d3ee]/15 hover:bg-[#22d3ee]/25 border border-[#22d3ee]/40 text-[#22d3ee] text-xs font-semibold flex items-center gap-1.5"
              >
                <Download size={13} />
                <span>Export Opt-In Dataset</span>
              </button>
            )}
          </div>

          <p className="text-xs text-[#94a3b8]">
            Fine-tuning executes strictly offline on your workstation hardware—never triggered automatically from the browser.
          </p>

          <pre className="p-3 rounded-xl bg-[#07070f] border border-white/5 text-[11px] font-mono text-[#22d3ee] overflow-x-auto">
{`python training/scripts/train_lora_real.py --model Qwen/Qwen2.5-3B-Instruct --epochs 1
ollama create bantai-bhai -f training/configs/Modelfile.bantai`}
          </pre>
        </div>
      </div>
    </div>
  );
}
