'use client';

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../lib/api';
import { PersonalityMode } from '@bantai/shared';
import {
  Sliders,
  User,
  ShieldCheck,
  KeyRound,
  Lock,
  LogOut,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Loader2
} from 'lucide-react';

const PERSONALITIES: PersonalityMode[] = ['tapori', 'balanced', 'professional', 'developer', 'academic'];
const LANGUAGES: Array<'hinglish' | 'hindi' | 'english'> = ['hinglish', 'hindi', 'english'];

export function SettingsView() {
  const {
    user,
    setUser,
    personalityMode,
    setPersonalityMode,
    selectedModel,
    setSelectedModel,
    logout,
    wipeAccount
  } = useApp();

  const [language, setLanguage] = useState<'hinglish' | 'hindi' | 'english'>(
    user?.preferences?.language || 'hinglish'
  );
  const [voiceGender, setVoiceGender] = useState<'male' | 'female'>(
    user?.preferences?.voiceGender || 'male'
  );
  const [voiceSpeed, setVoiceSpeed] = useState<number>(user?.preferences?.voiceSpeed || 1.0);
  const [soundEffects, setSoundEffects] = useState<boolean>(
    user?.preferences?.soundEffectsEnabled ?? true
  );
  const [personalMemoryEnabled, setPersonalMemoryEnabled] = useState<boolean>(
    user?.learningConsent?.personalMemoryEnabled ?? true
  );
  const [crossUserOptIn, setCrossUserOptIn] = useState<boolean>(
    user?.learningConsent?.crossUserTrainingOptIn ?? false
  );

  // Password update state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // MFA state
  const [mfaSetupData, setMfaSetupData] = useState<{ secret: string; otpauthUri: string } | null>(null);
  const [mfaVerifyCode, setMfaVerifyCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [copiedRecovery, setCopiedRecovery] = useState(false);

  const [disableMfaOpen, setDisableMfaOpen] = useState(false);
  const [disableMfaPassword, setDisableMfaPassword] = useState('');
  const [disableMfaCode, setDisableMfaCode] = useState('');

  // Account deletion state
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [wiping, setWiping] = useState(false);

  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clearFeedback = () => {
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    setSaving(true);
    try {
      const updatedPrefsUser = await api.updatePreferences({
        defaultPersonalityMode: personalityMode,
        language,
        voiceGender,
        voiceSpeed,
        soundEffectsEnabled: soundEffects
      });
      const updatedConsentUser = await api.updateConsent({
        personalMemoryEnabled,
        crossUserTrainingOptIn: crossUserOptIn
      });
      setUser(updatedConsentUser || updatedPrefsUser);
      setStatusMessage('Preferences and privacy settings persisted.');
    } catch (err) {
      setErrorMessage((err as Error).message || 'Failed to save preferences.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    if (newPassword.length < 8 || newPassword.length > 72) {
      setErrorMessage('New password must be between 8 and 72 characters.');
      return;
    }
    setSaving(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setStatusMessage('Password updated and previous sessions invalidated.');
    } catch (err) {
      setErrorMessage((err as Error).message || 'Failed to change password.');
    } finally {
      setSaving(false);
    }
  };

  const handleStartMfaSetup = async () => {
    clearFeedback();
    setRecoveryCodes(null);
    setSaving(true);
    try {
      const setup = await api.setupMfa();
      setMfaSetupData(setup);
    } catch (err) {
      setErrorMessage((err as Error).message || 'Failed to initiate MFA setup.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    setSaving(true);
    try {
      const res = await api.confirmMfa(mfaVerifyCode.trim());
      setUser(res.user);
      setRecoveryCodes(res.recoveryCodes);
      setMfaSetupData(null);
      setMfaVerifyCode('');
      setStatusMessage('Two-factor authentication enabled! Save your recovery codes below.');
    } catch (err) {
      setErrorMessage((err as Error).message || 'Invalid authenticator code.');
    } finally {
      setSaving(false);
    }
  };

  const handleDisableMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    setSaving(true);
    try {
      const res = await api.disableMfa(disableMfaPassword, disableMfaCode.trim());
      setUser(res.user);
      setDisableMfaOpen(false);
      setDisableMfaPassword('');
      setDisableMfaCode('');
      setRecoveryCodes(null);
      setStatusMessage('Two-factor authentication disabled.');
    } catch (err) {
      setErrorMessage((err as Error).message || 'Failed to disable MFA.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyRecoveryCodes = async () => {
    if (!recoveryCodes) return;
    await navigator.clipboard.writeText(recoveryCodes.join('\n')).catch(() => {});
    setCopiedRecovery(true);
    setTimeout(() => setCopiedRecovery(false), 2000);
  };

  const handleWipeAccount = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') return;
    clearFeedback();
    setWiping(true);
    try {
      await wipeAccount();
    } catch (err) {
      setErrorMessage((err as Error).message || 'Failed to delete account.');
      setWiping(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#07070f] text-white p-4 sm:p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full space-y-6 pb-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sliders size={18} className="text-[#6366f1]" />
              <h2 className="text-base font-bold text-white tracking-tight">
                Preferences &amp; Account Security
              </h2>
            </div>
            <p className="text-xs text-[#64748b]">
              Manage assistant behavior, two-factor authentication (TOTP), password rotation, and account erasure.
            </p>
          </div>
        </div>

        {statusMessage && (
          <div className="p-3 rounded-xl bg-[#10b981]/10 border border-[#10b981]/30 text-[#6ee7b7] text-xs flex items-center gap-2">
            <CheckCircle2 size={15} className="shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#fca5a5] text-xs flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Account Profile Card */}
        <div className="surface-raised p-5 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <User size={16} className="text-[#22d3ee]" />
              <h3 className="text-sm font-bold text-white">Account Profile</h3>
            </div>
            <span
              className={`text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full border ${
                user?.mfaEnabled
                  ? 'bg-[#10b981]/15 text-[#10b981] border-[#10b981]/30'
                  : 'bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/30'
              }`}
            >
              {user?.mfaEnabled ? 'MFA Protected' : 'MFA Disabled'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[#07070f] border border-white/5">
              <span className="block text-[10px] font-mono text-[#64748b]">NAME</span>
              <span className="text-white font-medium">{user?.name || 'Bantai User'}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#07070f] border border-white/5">
              <span className="block text-[10px] font-mono text-[#64748b]">EMAIL</span>
              <span className="text-white font-medium break-all">{user?.email}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#07070f] border border-white/5">
              <span className="block text-[10px] font-mono text-[#64748b]">USERNAME / ROLE</span>
              <span className="text-white font-medium">@{user?.username} · {user?.role}</span>
            </div>
          </div>
        </div>

        {/* Assistant Preferences & Privacy Consent */}
        <form onSubmit={handleSavePreferences} className="surface-raised p-5 space-y-4">
          <h3 className="text-sm font-bold text-white">Assistant &amp; Privacy Preferences</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label htmlFor="pref-personality" className="block text-[#94a3b8]">
                Default Personality Mode
              </label>
              <select
                id="pref-personality"
                value={personalityMode}
                onChange={e => setPersonalityMode(e.target.value as PersonalityMode)}
                className="w-full bg-[#07070f] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#6366f1]"
              >
                {PERSONALITIES.map(mode => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="pref-model" className="block text-[#94a3b8]">
                Default Local Model
              </label>
              <select
                id="pref-model"
                value={selectedModel}
                onChange={e => setSelectedModel(e.target.value)}
                className="w-full bg-[#07070f] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#6366f1]"
              >
                <option value="bhai">BANTAI Bhai (7B Default)</option>
                <option value="chhotu">BANTAI Chhotu (3B Fast)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="pref-language" className="block text-[#94a3b8]">
                Primary Language
              </label>
              <select
                id="pref-language"
                value={language}
                onChange={e => setLanguage(e.target.value as 'hinglish' | 'hindi' | 'english')}
                className="w-full bg-[#07070f] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#6366f1]"
              >
                {LANGUAGES.map(l => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="pref-voice" className="block text-[#94a3b8]">
                Voice Profile &amp; Speed ({voiceSpeed.toFixed(1)}x)
              </label>
              <div className="flex gap-2">
                <select
                  id="pref-voice"
                  value={voiceGender}
                  onChange={e => setVoiceGender(e.target.value as 'male' | 'female')}
                  className="bg-[#07070f] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#6366f1]"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
                <input
                  type="range"
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  aria-label="Voice speed"
                  value={voiceSpeed}
                  onChange={e => setVoiceSpeed(parseFloat(e.target.value))}
                  className="flex-1 accent-[#6366f1]"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-1 text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-[#cbd5e1]">
              <input
                type="checkbox"
                checked={soundEffects}
                onChange={e => setSoundEffects(e.target.checked)}
                className="accent-[#6366f1]"
              />
              <span>Enable UI &amp; speech synthesis cues</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-[#cbd5e1]">
              <input
                type="checkbox"
                checked={personalMemoryEnabled}
                onChange={e => setPersonalMemoryEnabled(e.target.checked)}
                className="accent-[#6366f1]"
              />
              <span>Personal memory extraction</span>
            </label>
            <div className="flex items-center gap-2 text-[#cbd5e1]">
              <button
                type="button"
                role="switch"
                aria-checked={crossUserOptIn}
                aria-label="Toggle cross-user training opt-in"
                onClick={() => setCrossUserOptIn(v => !v)}
                className={`w-9 h-5 rounded-full transition-colors p-0.5 flex items-center ${
                  crossUserOptIn ? 'bg-[#10b981] justify-end' : 'bg-white/15 justify-start'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white block" />
              </button>
              <span>Cross-user LoRA training opt-in</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-[#6366f1] hover:bg-[#5558e6] disabled:opacity-50 text-white text-xs font-semibold"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </form>

        {/* Two-Factor Authentication (TOTP MFA) */}
        <div className="surface-raised p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-[#10b981]" />
              <h3 className="text-sm font-bold text-white">Two-Factor Authentication (TOTP)</h3>
            </div>

            {!user?.mfaEnabled && !mfaSetupData && (
              <button
                type="button"
                disabled={saving}
                onClick={handleStartMfaSetup}
                className="px-3.5 py-1.5 rounded-lg bg-[#6366f1] hover:bg-[#5558e6] text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <KeyRound size={13} />
                <span>Setup Authenticator MFA</span>
              </button>
            )}

            {user?.mfaEnabled && !disableMfaOpen && (
              <button
                type="button"
                onClick={() => setDisableMfaOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-[#ef4444]/15 hover:bg-[#ef4444]/25 border border-[#ef4444]/30 text-[#fca5a5] text-xs font-semibold"
              >
                Disable MFA
              </button>
            )}
          </div>

          <p className="text-xs text-[#94a3b8]">
            Protect your account with RFC 6238 authenticator codes (Google Authenticator, 1Password, Bitwarden) plus single-use recovery codes.
          </p>

          {mfaSetupData && (
            <form onSubmit={handleConfirmMfa} className="p-4 rounded-xl bg-[#07070f] border border-[#6366f1]/40 space-y-3">
              <div className="space-y-1 text-xs">
                <span className="font-mono text-[#64748b] uppercase text-[10px]">Manual Base32 Secret</span>
                <p className="font-mono text-[#22d3ee] break-all select-all" data-testid="mfa-setup-secret">
                  {mfaSetupData.secret}
                </p>
                <span className="font-mono text-[#64748b] uppercase text-[10px] block pt-1">Provisioning URI</span>
                <p className="font-mono text-[11px] text-[#94a3b8] break-all select-all">
                  {mfaSetupData.otpauthUri}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  value={mfaVerifyCode}
                  onChange={e => setMfaVerifyCode(e.target.value)}
                  placeholder="Enter 6-digit authenticator code"
                  aria-label="Enter 6-digit authenticator code"
                  className="flex-1 bg-[#0f0f1a] border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#6366f1]"
                />
                <button
                  type="submit"
                  disabled={saving || mfaVerifyCode.trim().length < 6}
                  className="px-4 py-2 rounded-lg bg-[#10b981] hover:bg-[#059669] disabled:opacity-50 text-white text-xs font-semibold"
                >
                  Confirm &amp; Activate
                </button>
                <button
                  type="button"
                  onClick={() => setMfaSetupData(null)}
                  className="px-3 py-2 rounded-lg bg-white/5 text-[#94a3b8] text-xs"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {recoveryCodes && (
            <div className="p-4 rounded-xl bg-[#f59e0b]/10 border border-[#f59e0b]/40 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#fbbf24]">
                  One-Time Recovery Codes (Store Securely)
                </span>
                <button
                  type="button"
                  onClick={handleCopyRecoveryCodes}
                  className="px-2.5 py-1 rounded-lg bg-black/30 text-[11px] text-white flex items-center gap-1"
                >
                  {copiedRecovery ? <Check size={12} className="text-[#10b981]" /> : <Copy size={12} />}
                  <span>{copiedRecovery ? 'Copied' : 'Copy All'}</span>
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs text-white">
                {recoveryCodes.map(code => (
                  <div key={code} className="px-2.5 py-1.5 rounded bg-[#07070f] border border-white/10 text-center">
                    {code}
                  </div>
                ))}
              </div>
            </div>
          )}

          {disableMfaOpen && (
            <form onSubmit={handleDisableMfa} className="p-4 rounded-xl bg-[#07070f] border border-[#ef4444]/30 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="password"
                  value={disableMfaPassword}
                  onChange={e => setDisableMfaPassword(e.target.value)}
                  placeholder="Current password"
                  aria-label="Current password to disable MFA"
                  className="bg-[#0f0f1a] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ef4444]"
                />
                <input
                  type="text"
                  value={disableMfaCode}
                  onChange={e => setDisableMfaCode(e.target.value)}
                  placeholder="TOTP or Recovery code"
                  aria-label="TOTP or Recovery code"
                  className="bg-[#0f0f1a] border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#ef4444]"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-[#ef4444] hover:bg-[#dc2626] text-white text-xs font-semibold"
                >
                  Confirm Disable MFA
                </button>
                <button
                  type="button"
                  onClick={() => setDisableMfaOpen(false)}
                  className="px-3 py-2 rounded-lg bg-white/5 text-[#94a3b8] text-xs"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Password Change & Session Controls */}
        <form onSubmit={handleChangePassword} className="surface-raised p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-[#6366f1]" />
            <h3 className="text-sm font-bold text-white">Password &amp; Session Management</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              placeholder="Current password"
              aria-label="Current password"
              className="bg-[#07070f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#6366f1]"
            />
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="New strong password (8-72 chars)"
              aria-label="New password"
              className="bg-[#07070f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#6366f1]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={saving || !currentPassword || !newPassword}
              className="px-4 py-2 rounded-xl bg-[#6366f1] hover:bg-[#5558e6] disabled:opacity-40 text-white text-xs font-semibold"
            >
              Update Password
            </button>

            <button
              type="button"
              onClick={() => logout(false)}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#cbd5e1] text-xs font-semibold flex items-center gap-1.5"
            >
              <LogOut size={13} />
              <span>Sign Out</span>
            </button>

            <button
              type="button"
              onClick={() => logout(true)}
              className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold"
            >
              Sign Out All Sessions
            </button>
          </div>
        </form>

        {/* Danger Zone — Account & Sovereign Data Erasure */}
        <div className="p-5 rounded-2xl bg-[#ef4444]/5 border border-[#ef4444]/30 space-y-3">
          <div className="flex items-center gap-2 text-[#f87171]">
            <Trash2 size={16} />
            <h3 className="text-sm font-bold">Danger Zone — Erase Account &amp; Data</h3>
          </div>
          <p className="text-xs text-[#fca5a5]/80">
            Permanently removes your user record, conversations, messages, memories, tasks, and knowledge chunks across MongoDB and Firebase.
          </p>
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
            <input
              type="text"
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder='Type DELETE to confirm'
              aria-label="Type DELETE to confirm account erasure"
              className="sm:w-56 bg-[#07070f] border border-[#ef4444]/30 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-[#94a3b8] focus:outline-none focus:border-[#ef4444]"
            />
            <button
              type="button"
              disabled={wiping || deleteConfirmText.trim().toUpperCase() !== 'DELETE'}
              onClick={handleWipeAccount}
              className="px-4 py-2 rounded-xl bg-[#ef4444] hover:bg-[#dc2626] disabled:opacity-40 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              {wiping && <Loader2 size={13} className="animate-spin" />}
              <span>Delete Account Forever</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
