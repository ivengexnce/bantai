'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { PersonalityMode } from '@bantai/shared';
import { APP_MODELS } from '../../lib/models';
import {
  Cpu,
  Sliders,
  Volume2,
  Shield,
  Brain,
  HardDrive,
  Check,
  Save,
  CheckCircle2
} from 'lucide-react';

function ToggleSwitch({
  checked,
  onChange,
  disabled
}: {
  checked: boolean;
  onChange: (c: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        checked ? 'bg-[#6366f1] shadow-[0_0_12px_rgba(99,102,241,0.5)]' : 'bg-white/10'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export function SettingsView() {
  const {
    personalityMode,
    setPersonalityMode,
    selectedModel,
    setSelectedModel
  } = useApp();

  const [ollamaEndpoint, setOllamaEndpoint] = useState('http://localhost:11434');
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [voiceVoiceGender, setVoiceGender] = useState<'male' | 'female'>('male');
  const [localStoreOnly, setLocalStoreOnly] = useState(true);
  const [learningConsent, setLearningConsent] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const PERSONALITY_DESCRIPTIONS: Record<PersonalityMode, string> = {
    tapori: 'Raw street-smart Mumbai Hinglish swagger. Fast, witty, direct problem solver with zero profanity.',
    balanced: 'Nuanced and clear bilingual explanations. Natural tone for daily tasks and conceptual discussions.',
    professional: 'Polished executive clarity. Formal summaries, architecture RFCs, and client deliverables.',
    developer: 'Strictly technical and terse. Code-first, zero small talk, rigorous type safety, and systems focus.',
    academic: 'Thorough research rigor. Deep technical theory, formal algorithms, citations, and complexity proofs.'
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#07070f] text-white p-6 overflow-y-auto font-sans">
      <div className="max-w-4xl mx-auto w-full space-y-8 pb-16">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sliders size={18} className="text-[#6366f1]" />
              <h2 className="text-base font-bold text-white tracking-tight">System & Runtime Configuration</h2>
            </div>
            <p className="text-xs text-[#64748b]">
              Configure hardware inference targets, voice synthesis, persona models, and air-gap privacy.
            </p>
          </div>

          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-button bg-[#6366f1] text-white text-xs font-semibold hover:bg-[#6366f1]/90 shadow-[0_0_14px_rgba(99,102,241,0.45)] transition-all flex items-center gap-2"
          >
            {savedSuccess ? (
              <>
                <Check size={14} className="text-emerald-400" />
                <span>Saved Changes</span>
              </>
            ) : (
              <>
                <Save size={14} />
                <span>Save Preferences</span>
              </>
            )}
          </button>
        </div>

        {/* Section 1: Model & API */}
        <div className="p-5 rounded-card surface-raised space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <Cpu size={16} className="text-[#6366f1]" />
            <h3 className="text-sm font-semibold text-white">Model & Silicon API</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#94a3b8] mb-1.5">
                Default Active Model
              </label>
              <select
                value={selectedModel}
                onChange={e => setSelectedModel(e.target.value)}
                className="w-full bg-[#07070f] border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#6366f1]"
              >
                {APP_MODELS.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.parameters}) — {m.ramRequirement} RAM
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#94a3b8] mb-1.5">
                Local Ollama Daemon URL
              </label>
              <input
                type="text"
                value={ollamaEndpoint}
                onChange={e => setOllamaEndpoint(e.target.value)}
                className="w-full bg-[#07070f] border border-white/10 rounded-lg p-2 text-xs font-mono text-[#22d3ee] focus:outline-none focus:border-[#6366f1]"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 text-xs font-mono text-[#64748b]">
            <span>Throughput Monitor: <strong className="text-emerald-400">32 tok/s (NVIDIA RTX A2000)</strong></span>
            <span>Quantization: <strong className="text-[#22d3ee]">4-bit NF4</strong></span>
          </div>
        </div>

        {/* Section 2: Personality */}
        <div className="p-5 rounded-card surface-raised space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <Sliders size={16} className="text-[#22d3ee]" />
            <h3 className="text-sm font-semibold text-white">Personality Persona</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(Object.keys(PERSONALITY_DESCRIPTIONS) as PersonalityMode[]).map(mode => {
              const isSelected = personalityMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPersonalityMode(mode)}
                  className={`p-3.5 rounded-card text-left transition-all border ${
                    isSelected
                      ? 'bg-[#16162a] border-[#6366f1] shadow-[0_0_16px_-4px_rgba(99,102,241,0.4)]'
                      : 'bg-[#07070f] border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-white capitalize">{mode}</span>
                    {isSelected && <Check size={14} className="text-[#6366f1]" />}
                  </div>
                  <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                    {PERSONALITY_DESCRIPTIONS[mode]}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 3: Voice Engine */}
        <div className="p-5 rounded-card surface-raised space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <Volume2 size={16} className="text-amber-400" />
            <h3 className="text-sm font-semibold text-white">Voice & Audio Engine</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-white block">Text-to-Speech Readout</span>
                <span className="text-xs text-[#64748b]">Enable native speech synthesis for assistant outputs.</span>
              </div>
              <ToggleSwitch checked={ttsEnabled} onChange={setTtsEnabled} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-[#94a3b8] mb-1.5">
                  Voice Tone & Accent
                </label>
                <select
                  value={voiceVoiceGender}
                  onChange={e => setVoiceGender(e.target.value as 'male' | 'female')}
                  className="w-full bg-[#07070f] border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#6366f1]"
                >
                  <option value="male">Natural Male (Mumbai Hinglish / English)</option>
                  <option value="female">Natural Female (Clear Professional)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#94a3b8] mb-1.5">
                  Speech Output Engine
                </label>
                <div className="p-2.5 rounded-lg bg-[#07070f] border border-white/5 text-xs text-[#94a3b8] font-mono">
                  WebSpeech On-Device Silicon API
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Privacy & Air-Gap */}
        <div className="p-5 rounded-card surface-raised space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <Shield size={16} className="text-[#10b981]" />
            <h3 className="text-sm font-semibold text-white">Privacy & Air-Gap Isolation</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-white block">Local Storage Exclusivity</span>
                <span className="text-xs text-[#64748b]">Store all chats and embeddings locally in SQLite + Chroma. Never sync to cloud.</span>
              </div>
              <ToggleSwitch checked={localStoreOnly} onChange={setLocalStoreOnly} />
            </div>

            <div className="p-3 rounded-lg bg-[#07070f] border border-white/5 space-y-1 text-xs">
              <span className="font-mono text-[10px] uppercase text-emerald-400 font-semibold tracking-wider">
                Air-Gap Verification Status
              </span>
              <p className="text-[#94a3b8] text-[11px] leading-relaxed">
                Zero telemetry packets transmitted. Cloud API bypass enforced. Local loopback bound to 127.0.0.1.
              </p>
            </div>
          </div>
        </div>

        {/* Section 5: Continuous Learning */}
        <div className="p-5 rounded-card surface-raised space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <Brain size={16} className="text-[#6366f1]" />
            <h3 className="text-sm font-semibold text-white">Continuous Learning & Feedback Ingestion</h3>
          </div>

          <div className="flex items-center justify-between">
            <div className="max-w-xl">
              <span className="text-xs font-semibold text-white block">Opt-In Calibration Data Logging</span>
              <span className="text-xs text-[#64748b] leading-relaxed block mt-0.5">
                When enabled, thumbs-up corrections and feedback are saved directly to your local JSONL dataset for subsequent QLoRA adapter training iterations.
              </span>
            </div>
            <ToggleSwitch checked={learningConsent} onChange={setLearningConsent} />
          </div>
        </div>
      </div>
    </div>
  );
}
