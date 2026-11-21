'use client';

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../lib/api';
import { PersonalityMode, SUPPORTED_MODELS } from '@bantai/shared';
import {
  Settings,
  ShieldAlert,
  Brain,
  Database,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Cpu,
  Check
} from 'lucide-react';

export function SettingsView() {
  const {
    user,
    setUser,
    personalityMode,
    setPersonalityMode,
    selectedModel,
    setSelectedModel,
    logout
  } = useApp();

  const [memoryEnabled, setMemoryEnabled] = useState(
    user?.learningConsent?.personalMemoryEnabled ?? true
  );
  const [crossUserOptIn, setCrossUserOptIn] = useState(
    user?.learningConsent?.crossUserTrainingOptIn ?? false
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleSaveConsent = async () => {
    try {
      const updated = await api.updateConsent({
        personalMemoryEnabled: memoryEnabled,
        crossUserTrainingOptIn: crossUserOptIn
      });
      setUser(updated);
      setStatusMessage('Privacy and learning consent preferences updated successfully!');
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      console.error('Failed to update consent:', err);
    }
  };

  const handlePersonalityChange = async (mode: PersonalityMode) => {
    setPersonalityMode(mode);
    try {
      const updated = await api.updatePreferences({ defaultPersonalityMode: mode });
      setUser(updated);
    } catch (err) {
      console.error('Failed to update preference:', err);
    }
  };

  const handleWipeAccount = async () => {
    const confirmed = prompt(
      'DANGER: To permanently delete your account and erase all conversations, memories, and personal tasks across both MongoDB and Firebase, type "DELETE":'
    );
    if (confirmed === 'DELETE') {
      try {
        await api.wipeUserData();
        alert('Account and all associated records have been erased.');
        logout();
      } catch (err) {
        alert('Failed to erase account: ' + (err as Error).message);
      }
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-bantai-dark">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-bantai-400" /> Settings & Continuous Learning Governance
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Configure system defaults, personal memory isolation, and model fine-tuning consent.
          </p>
        </div>

        {statusMessage && (
          <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> {statusMessage}
          </div>
        )}

        {/* Profile Details */}
        <div className="p-6 bg-bantai-darkCard border border-bantai-darkBorder rounded-2xl space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-bantai-400" /> Account Profile (MongoDB Isolated Record)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-gray-400 block mb-1">Full Name</span>
              <div className="p-2.5 bg-black/40 border border-bantai-darkBorder rounded-xl text-white">
                {user?.name}
              </div>
            </div>
            <div>
              <span className="text-gray-400 block mb-1">Email Address</span>
              <div className="p-2.5 bg-black/40 border border-bantai-darkBorder rounded-xl text-white">
                {user?.email}
              </div>
            </div>
            <div>
              <span className="text-gray-400 block mb-1">User ID (Immutable UUID)</span>
              <div className="p-2.5 bg-black/40 border border-bantai-darkBorder rounded-xl text-gray-400 font-mono text-[11px]">
                {user?.userId}
              </div>
            </div>
            <div>
              <span className="text-gray-400 block mb-1">Account Role & Status</span>
              <div className="p-2.5 bg-black/40 border border-bantai-darkBorder rounded-xl text-white flex items-center justify-between">
                <span className="capitalize">{user?.role}</span>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[10px] font-semibold uppercase">
                  {user?.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Personality & Preferences */}
        <div className="p-6 bg-bantai-darkCard border border-bantai-darkBorder rounded-2xl space-y-4">
          <h2 className="text-sm font-bold text-white">Default Personality Mode</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
            {(['tapori', 'balanced', 'professional', 'developer', 'academic'] as PersonalityMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => handlePersonalityChange(mode)}
                className={`p-3 rounded-xl border text-center capitalize transition ${
                  personalityMode === mode
                    ? 'bg-bantai-500 border-bantai-500 text-black font-bold shadow-md'
                    : 'bg-black/30 border-bantai-darkBorder text-gray-300 hover:text-white'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* BANTAI Model Family Lineup (Section 9 Branding Spec) */}
        <div className="p-6 bg-bantai-darkCard border border-bantai-darkBorder rounded-2xl space-y-5">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-bantai-400" /> Choose Your BANTAI
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Who do you want running the show? Select the model that powers your assistant.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SUPPORTED_MODELS.map(m => {
              const isSelected = selectedModel === m.id;
              return (
                <div
                  key={m.id}
                  onClick={() => {
                    setSelectedModel(m.id);
                    setStatusMessage(`Switched active model to ${m.displayName}`);
                    setTimeout(() => setStatusMessage(null), 3000);
                  }}
                  className={`p-5 rounded-2xl border cursor-pointer transition relative flex flex-col justify-between ${
                    isSelected
                      ? 'bg-gradient-to-b from-white/10 to-black/60 border-bantai-500 shadow-lg shadow-bantai-500/10'
                      : 'bg-black/30 border-bantai-darkBorder hover:border-white/20'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{m.icon}</span>
                        <span className="text-sm font-bold text-white">{m.name}</span>
                        {m.isDefault && (
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[9px] font-bold uppercase tracking-wider">
                            DEFAULT
                          </span>
                        )}
                      </div>
                      {isSelected ? (
                        <div className="w-6 h-6 rounded-full bg-bantai-500 text-black flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full border border-gray-600" />
                      )}
                    </div>

                    <div className="text-xs font-semibold text-bantai-400 italic">
                      &quot;{m.tagline}&quot;
                    </div>

                    <p className="text-xs text-gray-300 leading-relaxed">
                      {m.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/5 space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Speed</span>
                      <div className="flex items-center gap-1.5 font-mono">
                        <div className="w-20 h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-400 rounded-full"
                            style={{ width: `${(m.speedRating / 12) * 100}%` }}
                          />
                        </div>
                        <span className="text-gray-300 w-12 text-right">{m.speedLabel}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Power</span>
                      <div className="flex items-center gap-1.5 font-mono">
                        <div className="w-20 h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-400 rounded-full"
                            style={{ width: `${(m.powerRating / 12) * 100}%` }}
                          />
                        </div>
                        <span className="text-gray-300 w-12 text-right">{m.powerLabel}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-[10px] text-gray-400">
                      <span>Hardware: {m.hardware}</span>
                      <span>RAM: {m.ramRequirement}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Continuous Learning & Privacy Controls */}
        <div className="p-6 bg-bantai-darkCard border border-bantai-darkBorder rounded-2xl space-y-5">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-400" /> Continuous Learning & Training Consent
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              BANTAI strictly separates personal memory from cross-user foundation model fine-tuning.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            {/* Setting 1: Personal Memory */}
            <div className="flex items-start justify-between p-3.5 bg-black/30 border border-bantai-darkBorder rounded-xl">
              <div className="space-y-1 pr-4">
                <div className="font-semibold text-white">Personal Semantic Memory</div>
                <div className="text-gray-400">
                  Allow BANTAI to remember your personal preferences, goals, and facts across conversations. This data is strictly user-isolated and never modifies shared model weights.
                </div>
              </div>
              <input
                type="checkbox"
                checked={memoryEnabled}
                onChange={e => setMemoryEnabled(e.target.checked)}
                className="mt-1 w-4 h-4 accent-bantai-500 rounded cursor-pointer"
              />
            </div>

            {/* Setting 2: Cross-user Training (Strict Opt-in) */}
            <div className="flex items-start justify-between p-3.5 bg-black/30 border border-bantai-darkBorder rounded-xl">
              <div className="space-y-1 pr-4">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  Cross-User Model Fine-Tuning (LoRA/QLoRA)
                  <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded text-[9px] font-bold uppercase">
                    Opt-In Only
                  </span>
                </div>
                <div className="text-gray-400">
                  Voluntarily allow approved, PII-scrubbed conversation feedback to be included in periodic self-hosted open-weight fine-tuning datasets. Default is strictly disabled.
                </div>
                {user?.learningConsent?.consentTimestamp && (
                  <div className="text-[10px] text-gray-500 font-mono">
                    Consent Logged: {new Date(user.learningConsent.consentTimestamp).toLocaleString()} · Policy v{user.learningConsent.policyVersion}
                  </div>
                )}
              </div>
              <input
                type="checkbox"
                checked={crossUserOptIn}
                onChange={e => setCrossUserOptIn(e.target.checked)}
                className="mt-1 w-4 h-4 accent-bantai-500 rounded cursor-pointer"
              />
            </div>
          </div>

          <button
            onClick={handleSaveConsent}
            className="px-4 py-2 bg-bantai-500 hover:bg-bantai-600 text-black font-semibold text-xs rounded-xl transition"
          >
            Save Privacy Settings
          </button>
        </div>

        {/* Danger Zone: Wipe All Records */}
        <div className="p-6 bg-red-950/20 border border-red-900/40 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 text-red-400 text-sm font-bold">
            <ShieldAlert className="w-4 h-4" /> Danger Zone: Permanent Account & Data Erasure
          </div>
          <p className="text-xs text-gray-400">
            Permanently delete your user profile from MongoDB, and erase all conversations, messages, personal memories, tasks, and uploaded files from Firebase. This action cannot be reversed.
          </p>
          <button
            onClick={handleWipeAccount}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 transition"
          >
            <Trash2 className="w-4 h-4" /> Permanently Delete Account & Wipe All Data
          </button>
        </div>
      </div>
    </div>
  );
}
