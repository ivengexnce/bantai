'use client';

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../lib/api';
import { PersonalityMode } from '@bantai/shared';
import { APP_MODELS } from '../../lib/models';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Dialog } from '../ui/Dialog';

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
  const [showWipeModal, setShowWipeModal] = useState(false);
  const [wipeConfirmText, setWipeConfirmText] = useState('');
  const [isWiping, setIsWiping] = useState(false);

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

  const handleConfirmWipe = async () => {
    if (wipeConfirmText !== 'DELETE') return;
    setIsWiping(true);
    try {
      await api.wipeUserData();
      logout();
    } catch (err) {
      alert('Failed to erase account: ' + (err as Error).message);
      setIsWiping(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-[#0e1014] text-[#d4d6db] font-mono text-xs select-none">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Specification */}
        <div className="border-b border-[#20232b] pb-4">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="warning">[09] SYSTEM CONFIG</Badge>
            <Badge variant="success">SOVEREIGN GOVERNANCE ACTIVE</Badge>
          </div>
          <h1 className="text-xl font-bold text-[#f0f2f5] uppercase tracking-wider">
            Settings & Continuous Learning Governance
          </h1>
          <p className="text-xs text-[#8c919e] mt-1">
            Configure system defaults, personal memory isolation, and model fine-tuning consent.
          </p>
        </div>

        {statusMessage && (
          <div className="p-3 bg-[#0a1c12] border border-[#10b981] text-[#10b981] text-xs">
            &gt; [SUCCESS]: {statusMessage}
          </div>
        )}

        {/* Profile Details */}
        <div className="p-6 bg-[#12141a] border border-[#20232b] space-y-4">
          <div className="text-xs font-bold text-[#f0f2f5] uppercase flex items-center justify-between">
            <span>[ACCOUNT PROFILE // MONGODB ISOLATED RECORD]</span>
            <span className="text-[10px] text-[#10b981]">ENCRYPTED IDENTITY</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-[10px] text-[#8c919e] uppercase block mb-1">Full Name</span>
              <div className="p-2.5 bg-[#090b0e] border border-[#20232b] text-[#f0f2f5]">
                {user?.name || 'Bantai Operator'}
              </div>
            </div>
            <div>
              <span className="text-[10px] text-[#8c919e] uppercase block mb-1">Email Address</span>
              <div className="p-2.5 bg-[#090b0e] border border-[#20232b] text-[#f0f2f5]">
                {user?.email || 'operator@bantai.local'}
              </div>
            </div>
            <div>
              <span className="text-[10px] text-[#8c919e] uppercase block mb-1">User ID (Immutable UUID)</span>
              <div className="p-2.5 bg-[#090b0e] border border-[#20232b] text-[#8c919e] text-[11px]">
                {user?.userId || 'N/A'}
              </div>
            </div>
            <div>
              <span className="text-[10px] text-[#8c919e] uppercase block mb-1">Account Role & Status</span>
              <div className="p-2.5 bg-[#090b0e] border border-[#20232b] text-[#f0f2f5] flex items-center justify-between">
                <span className="uppercase">{user?.role || 'operator'}</span>
                <Badge variant="success">[{user?.status || 'active'}]</Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Personality & Preferences */}
        <div className="p-6 bg-[#12141a] border border-[#20232b] space-y-4">
          <div className="text-xs font-bold text-[#f0f2f5] uppercase">
            [DEFAULT OPERATIONAL PERSONALITY MODE]
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
            {(['tapori', 'balanced', 'professional', 'developer', 'academic'] as PersonalityMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => handlePersonalityChange(mode)}
                className={`p-3 border text-center uppercase transition-colors font-bold ${
                  personalityMode === mode
                    ? 'bg-[#cc8e25] border-[#cc8e25] text-black'
                    : 'bg-[#090b0e] border-[#20232b] text-[#8c919e] hover:text-[#f0f2f5]'
                }`}
              >
                [{mode}]
              </button>
            ))}
          </div>
        </div>

        {/* BANTAI Model Family Lineup */}
        <div className="p-6 bg-[#12141a] border border-[#20232b] space-y-5">
          <div>
            <div className="text-xs font-bold text-[#f0f2f5] uppercase flex items-center justify-between">
              <span>[CHOOSE ACTIVE BANTAI MODEL ENGINE]</span>
              <span className="text-[10px] text-[#cc8e25]">100% LOCAL SILICON</span>
            </div>
            <p className="text-xs text-[#8c919e] mt-1">
              Select the open-weight model that powers your assistant on local hardware.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {APP_MODELS.map(m => {
              const isSelected = selectedModel === m.id;
              return (
                <div
                  key={m.id}
                  onClick={() => {
                    setSelectedModel(m.id);
                    setStatusMessage(`Switched active model to ${m.name}`);
                    setTimeout(() => setStatusMessage(null), 3000);
                  }}
                  className={`p-4 border cursor-pointer transition-colors flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#181b22] border-[#cc8e25]'
                      : 'bg-[#090b0e] border-[#20232b] hover:border-[#3a4050]'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#f0f2f5] uppercase">
                          {m.name}
                        </span>
                        {m.isDefault && (
                          <Badge variant="warning">[DEFAULT]</Badge>
                        )}
                      </div>
                      <span className={`text-[10px] font-bold ${isSelected ? 'text-[#cc8e25]' : 'text-[#5a6070]'}`}>
                        {isSelected ? '[ACTIVE]' : '[SELECT]'}
                      </span>
                    </div>

                    <div className="text-[11px] font-bold text-[#cc8e25]">
                      &quot;{m.tagline}&quot;
                    </div>

                    <p className="text-xs text-[#8c919e] leading-relaxed">
                      {m.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#20232b] flex items-center justify-between text-[10px] text-[#5a6070]">
                    <span>PARAMETERS: {m.parameters}</span>
                    <span>HARDWARE: {m.hardware}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Continuous Learning & Privacy Controls */}
        <div className="p-6 bg-[#12141a] border border-[#20232b] space-y-4">
          <div className="text-xs font-bold text-[#f0f2f5] uppercase">
            [CONTINUOUS LEARNING & TRAINING CONSENT]
          </div>
          <p className="text-xs text-[#8c919e]">
            BANTAI strictly separates personal memory from cross-user foundation model fine-tuning.
          </p>

          <div className="space-y-3 text-xs">
            {/* Setting 1: Personal Memory */}
            <div className="flex items-start justify-between p-3.5 bg-[#090b0e] border border-[#20232b]">
              <div className="space-y-1 pr-4">
                <div className="font-bold text-[#f0f2f5] uppercase">[01] PERSONAL SEMANTIC MEMORY</div>
                <div className="text-[#8c919e]">
                  Allow BANTAI to remember your personal preferences, goals, and facts across conversations. Strictly isolated to your account.
                </div>
              </div>
              <input
                type="checkbox"
                checked={memoryEnabled}
                onChange={e => setMemoryEnabled(e.target.checked)}
                className="mt-1 w-4 h-4 accent-[#cc8e25] cursor-pointer"
              />
            </div>

            {/* Setting 2: Cross-user Training (Strict Opt-in) */}
            <div className="flex items-start justify-between p-3.5 bg-[#090b0e] border border-[#20232b]">
              <div className="space-y-1 pr-4">
                <div className="font-bold text-[#f0f2f5] uppercase flex items-center gap-2">
                  <span>[02] CROSS-USER MODEL FINE-TUNING (LORA)</span>
                  <Badge variant="warning">OPT-IN ONLY</Badge>
                </div>
                <div className="text-[#8c919e]">
                  Voluntarily allow approved, PII-scrubbed conversation feedback to be included in periodic self-hosted fine-tuning datasets. Default is strictly disabled.
                </div>
              </div>
              <input
                type="checkbox"
                checked={crossUserOptIn}
                onChange={e => setCrossUserOptIn(e.target.checked)}
                className="mt-1 w-4 h-4 accent-[#cc8e25] cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveConsent}
            >
              [+] SAVE PRIVACY SETTINGS
            </Button>
          </div>
        </div>

        {/* Danger Zone: Wipe All Records */}
        <div className="p-6 bg-[#181012] border border-red-500/50 space-y-3">
          <div className="text-xs font-bold text-red-400 uppercase">
            [DANGER ZONE: PERMANENT ACCOUNT & DATA ERASURE]
          </div>
          <p className="text-xs text-[#8c919e]">
            Permanently delete your user profile from MongoDB, and erase all conversations, messages, personal memories, tasks, and uploaded files from Firebase. This action cannot be reversed.
          </p>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              setWipeConfirmText('');
              setShowWipeModal(true);
            }}
          >
            [!] PERMANENTLY DELETE ACCOUNT & WIPE ALL DATA
          </Button>
        </div>

        {/* Wipe Modal Dialog */}
        <Dialog
          isOpen={showWipeModal}
          onClose={() => setShowWipeModal(false)}
          title="CONFIRM PERMANENT DATA PURGE"
        >
          <div className="space-y-4">
            <p className="text-xs text-[#d4d6db] leading-relaxed">
              This will immediately purge your MongoDB user account and cascade-delete all Firestore conversations, personal tasks, memories, reminders, and uploads.
            </p>
            <div className="space-y-1.5 text-xs">
              <label className="text-[#8c919e] uppercase block">
                Type <strong>DELETE</strong> to confirm:
              </label>
              <input
                type="text"
                value={wipeConfirmText}
                onChange={e => setWipeConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full px-3 py-2 bg-[#090b0e] border border-red-500/60 text-[#f0f2f5] font-mono uppercase focus:outline-none focus:border-red-500"
              />
            </div>
            <div className="flex justify-end gap-3 pt-3 border-t border-[#20232b]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowWipeModal(false)}
              >
                CANCEL
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={wipeConfirmText !== 'DELETE' || isWiping}
                onClick={handleConfirmWipe}
              >
                {isWiping ? '[PURGING...]' : '[ERASE EVERYTHING]'}
              </Button>
            </div>
          </div>
        </Dialog>
      </div>
    </div>
  );
}
