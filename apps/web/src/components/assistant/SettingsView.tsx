'use client';

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../lib/api';
import { PersonalityMode } from '@bantai/shared';
import { APP_MODELS } from '../../lib/models';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Dialog } from '../ui/Dialog';
import {
  speakText,
  stopSpeaking,
  PRESET_ELEVENLABS_VOICES,
  ElevenLabsVoiceOption
} from '../../lib/voiceEngine';

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
  const [voiceSpeed, setVoiceSpeed] = useState<number>(user?.preferences?.voiceSpeed ?? 1.0);
  const [voiceGender, setVoiceGender] = useState<'male' | 'female'>(user?.preferences?.voiceGender ?? 'male');
  const [isPlayingTestVoice, setIsPlayingTestVoice] = useState(false);

  // ElevenLabs Voice Integration State
  const [voiceProvider, setVoiceProvider] = useState<'browser' | 'elevenlabs'>('browser');
  const [elevenApiKey, setElevenApiKey] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [elevenVoiceId, setElevenVoiceId] = useState<string>('pNInz6obpgDQGcFmaJgB');
  const [elevenModelId, setElevenModelId] = useState<string>('eleven_multilingual_v2');
  const [customVoiceId, setCustomVoiceId] = useState('');
  const [elevenVoices, setElevenVoices] = useState<ElevenLabsVoiceOption[]>(PRESET_ELEVENLABS_VOICES);
  const [isValidatingKey, setIsValidatingKey] = useState(false);

  // Initialize ElevenLabs from localStorage on mount
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedProvider = localStorage.getItem('bantai_voice_provider') as 'browser' | 'elevenlabs';
      if (storedProvider) setVoiceProvider(storedProvider);
      const storedKey = localStorage.getItem('bantai_elevenlabs_key') || '';
      if (storedKey) {
        setElevenApiKey(storedKey);
        api.getElevenLabsVoices(storedKey).then(res => {
          if (res?.voices?.length) {
            setElevenVoices(res.voices.map(v => ({
              voice_id: v.voice_id,
              name: v.name,
              gender: v.labels?.gender?.toLowerCase() === 'female' ? 'female' : 'male',
              description: v.description || (v.labels ? Object.values(v.labels).join(', ') : 'Custom voice')
            })));
          }
        }).catch(() => {});
      }
      const storedVoiceId = localStorage.getItem('bantai_elevenlabs_voice_id');
      if (storedVoiceId) setElevenVoiceId(storedVoiceId);
      const storedModelId = localStorage.getItem('bantai_elevenlabs_model_id');
      if (storedModelId) setElevenModelId(storedModelId);
    }
  }, []);

  const handleProviderChange = (provider: 'browser' | 'elevenlabs') => {
    setVoiceProvider(provider);
    if (typeof window !== 'undefined') {
      localStorage.setItem('bantai_voice_provider', provider);
    }
    setStatusMessage(`Voice provider set to ${provider === 'elevenlabs' ? 'ElevenLabs Neural Audio' : 'Local Browser Engine'}`);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleSaveElevenKey = async () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('bantai_elevenlabs_key', elevenApiKey.trim());
    }
    setIsValidatingKey(true);
    try {
      const res = await api.getElevenLabsVoices(elevenApiKey.trim());
      if (res && res.voices && res.voices.length > 0) {
        setElevenVoices(res.voices.map(v => ({
          voice_id: v.voice_id,
          name: v.name,
          gender: v.labels?.gender?.toLowerCase() === 'female' ? 'female' : 'male',
          description: v.description || (v.labels ? Object.values(v.labels).join(', ') : 'Custom voice')
        })));
        setStatusMessage(`ElevenLabs API connected! Loaded ${res.voices.length} voices.`);
      } else {
        setStatusMessage('ElevenLabs key saved! Using popular ElevenLabs voice lineup.');
      }
    } catch (err) {
      console.warn('ElevenLabs key validation warning:', err);
      setStatusMessage('ElevenLabs key saved locally.');
    } finally {
      setIsValidatingKey(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleSelectElevenVoice = (voiceId: string) => {
    setElevenVoiceId(voiceId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('bantai_elevenlabs_voice_id', voiceId);
    }
  };

  const handleSelectElevenModel = (modelId: string) => {
    setElevenModelId(modelId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('bantai_elevenlabs_model_id', modelId);
    }
  };

  const handleSaveVoicePreferences = async (newSpeed: number, newGender: 'male' | 'female') => {
    setVoiceSpeed(newSpeed);
    setVoiceGender(newGender);
    try {
      const updated = await api.updatePreferences({
        voiceSpeed: newSpeed,
        voiceGender: newGender
      });
      setUser(updated);
      setStatusMessage('Voice synthesizer parameters saved successfully!');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.error('Failed to update voice preference:', err);
    }
  };

  const handleTestVoice = () => {
    if (isPlayingTestVoice) {
      stopSpeaking();
      setIsPlayingTestVoice(false);
      return;
    }

    const testPhrase = personalityMode === 'tapori'
      ? (voiceProvider === 'elevenlabs'
          ? 'Arey bhidu! BANTAI voice model with ElevenLabs neural intelligence is online! Ekdum authentic sound kar raha hai.'
          : 'Arey bhidu! BANTAI voice model ekdum rapchik chal raha hai! Poora hisaab-kitaab on-point hai.')
      : (voiceProvider === 'elevenlabs'
          ? 'Greetings! This is BANTAI powered by ElevenLabs studio neural voice synthesis.'
          : 'Greetings! BANTAI voice synthesis engine is calibrated with natural pacing and zero syntax noise.');

    setIsPlayingTestVoice(true);
    speakText(testPhrase, {
      mode: personalityMode,
      provider: voiceProvider,
      elevenVoiceId: customVoiceId.trim() || elevenVoiceId,
      elevenModelId,
      elevenApiKey: elevenApiKey.trim() || undefined,
      gender: voiceGender,
      rate: voiceSpeed,
      onEnd: () => setIsPlayingTestVoice(false),
      onError: (err) => {
        alert((err as Error)?.message || 'Voice test error');
        setIsPlayingTestVoice(false);
      }
    });
  };

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

        {/* Voice Synthesis & Audio Speech Engine */}
        <div className="p-6 bg-[#12141a] border border-[#20232b] space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-[#f0f2f5] uppercase flex items-center gap-2">
              <span>[VOICE MODEL & NATURAL SPEECH ENGINE]</span>
              <Badge variant={voiceProvider === 'elevenlabs' ? 'success' : 'neutral'}>
                {voiceProvider === 'elevenlabs' ? 'ELEVENLABS NEURAL' : 'LOCAL BROWSER'}
              </Badge>
            </div>
            <button
              onClick={handleTestVoice}
              className={`px-3 py-1 text-[11px] font-bold uppercase border transition-colors flex items-center gap-1.5 ${
                isPlayingTestVoice
                  ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                  : 'bg-[#2F6BFF]/20 border-[#2F6BFF] text-[#2F6BFF] hover:bg-[#2F6BFF]/30'
              }`}
            >
              <span>{isPlayingTestVoice ? '■ Stop Audio' : `▶ Test ${voiceProvider === 'elevenlabs' ? 'ElevenLabs' : 'Local'} Voice`}</span>
            </button>
          </div>

          <p className="text-xs text-[#8c919e] leading-relaxed">
            Choose between 100% sovereign on-device browser speech synthesis or connect your ElevenLabs account for studio-grade neural voice cloning.
          </p>

          {/* Voice Provider Selector Tabs */}
          <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
            <button
              onClick={() => handleProviderChange('browser')}
              className={`p-3 border text-center transition-all ${
                voiceProvider === 'browser'
                  ? 'bg-[#181b22] border-[#2F6BFF] text-white font-bold'
                  : 'bg-[#090b0e] border-[#20232b] text-[#8c919e] hover:text-white'
              }`}
            >
              <div className="font-bold uppercase text-[11px]">[01] LOCAL SPEECH (ON-DEVICE)</div>
              <div className="text-[10px] text-[#64748B] mt-0.5">100% Free · Zero API calls · Regional Accents</div>
            </button>

            <button
              onClick={() => handleProviderChange('elevenlabs')}
              className={`p-3 border text-center transition-all ${
                voiceProvider === 'elevenlabs'
                  ? 'bg-[#181b22] border-[#2F6BFF] text-white font-bold'
                  : 'bg-[#090b0e] border-[#20232b] text-[#8c919e] hover:text-white'
              }`}
            >
              <div className="font-bold uppercase text-[11px] flex items-center justify-center gap-1.5">
                <span>[02] ELEVENLABS NEURAL AI</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
              </div>
              <div className="text-[10px] text-[#64748B] mt-0.5">Studio Quality · Voice Cloning · Multilingual v2</div>
            </button>
          </div>

          {/* ELEVENLABS CONFIGURATION PANEL */}
          {voiceProvider === 'elevenlabs' ? (
            <div className="space-y-4 pt-2 border-t border-[#20232b]">
              {/* API Key Input */}
              <div className="p-4 bg-[#090b0e] border border-[#20232b] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-[#8c919e] uppercase">
                    ElevenLabs API Key (xi-api-key)
                  </label>
                  <a
                    href="https://elevenlabs.io"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-[#2F6BFF] hover:underline"
                  >
                    Get Free Key from ElevenLabs.io →
                  </a>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={elevenApiKey}
                      onChange={e => setElevenApiKey(e.target.value)}
                      placeholder="sk_..."
                      className="w-full px-3 py-2 bg-[#12141a] border border-[#20232b] text-white text-xs font-mono focus:outline-none focus:border-[#2F6BFF]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(prev => !prev)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#8c919e] hover:text-white"
                    >
                      {showApiKey ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <button
                    onClick={handleSaveElevenKey}
                    disabled={isValidatingKey}
                    className="px-4 py-2 bg-[#2F6BFF] hover:bg-[#2F6BFF]/90 text-white font-bold text-xs uppercase transition-colors shrink-0"
                  >
                    {isValidatingKey ? 'Verifying...' : 'Save & Connect'}
                  </button>
                </div>
                <p className="text-[10px] text-[#64748B]">
                  Your API key is securely stored in your local browser session and passed directly to your self-hosted backend.
                </p>
              </div>

              {/* Voice Lineup Grid */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#8c919e] uppercase block">
                  Select ElevenLabs Neural Voice
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  {elevenVoices.map(v => {
                    const isSelected = elevenVoiceId === v.voice_id && !customVoiceId.trim();
                    return (
                      <button
                        key={v.voice_id}
                        type="button"
                        onClick={() => {
                          setCustomVoiceId('');
                          handleSelectElevenVoice(v.voice_id);
                        }}
                        className={`p-3 border text-left flex flex-col justify-between transition-colors ${
                          isSelected
                            ? 'bg-[#181b22] border-[#2F6BFF] text-white'
                            : 'bg-[#090b0e] border-[#20232b] text-[#8c919e] hover:border-white/20'
                        }`}
                      >
                        <div>
                          <div className="font-bold flex items-center justify-between text-[#f0f2f5]">
                            <span>{v.name}</span>
                            <span className="text-[9px] uppercase px-1 py-0.5 rounded bg-white/5 text-[#8c919e]">
                              {v.gender}
                            </span>
                          </div>
                          <p className="text-[10px] text-[#64748B] mt-1 line-clamp-2">
                            {v.description}
                          </p>
                        </div>
                        <div className="mt-2 text-[9px] font-mono text-[#2F6BFF]">
                          {isSelected ? '● ACTIVE' : '○ SELECT'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Voice ID Option */}
              <div className="p-3 bg-[#090b0e] border border-[#20232b] space-y-1.5">
                <label className="text-[10px] font-bold text-[#8c919e] uppercase block">
                  Or Custom Cloned Voice ID (from ElevenLabs VoiceLab)
                </label>
                <input
                  type="text"
                  value={customVoiceId}
                  onChange={e => setCustomVoiceId(e.target.value)}
                  placeholder="e.g. 21m00Tcm4TlvDq8ikWAM"
                  className="w-full px-3 py-1.5 bg-[#12141a] border border-[#20232b] text-white text-xs font-mono focus:outline-none focus:border-[#2F6BFF]"
                />
              </div>

              {/* ElevenLabs Model Selector */}
              <div className="p-3 bg-[#090b0e] border border-[#20232b] space-y-2">
                <label className="text-[10px] font-bold text-[#8c919e] uppercase block">
                  ElevenLabs Generation Model
                </label>
                <div className="flex gap-2">
                  {[
                    { id: 'eleven_multilingual_v2', name: 'Multilingual v2 (Recommended)', desc: 'Best accent handling, supports Hinglish / Tapori & 29 languages.' },
                    { id: 'eleven_turbo_v2_5', name: 'Turbo v2.5', desc: 'Ultra-fast inference latency with high conversational fidelity.' }
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleSelectElevenModel(m.id)}
                      className={`flex-1 p-2.5 border text-left transition-colors ${
                        elevenModelId === m.id
                          ? 'bg-[#181b22] border-[#2F6BFF] text-white'
                          : 'bg-transparent border-[#20232b] text-[#8c919e] hover:text-white'
                      }`}
                    >
                      <div className="font-bold text-[11px] text-[#f0f2f5]">{m.name}</div>
                      <div className="text-[10px] text-[#64748B] mt-0.5">{m.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* LOCAL BROWSER CONFIGURATION PANEL */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Voice Speed */}
              <div className="p-3 bg-[#090b0e] border border-[#20232b] space-y-2">
                <span className="text-[10px] text-[#8c919e] uppercase block font-bold">
                  Speech Cadence / Speed
                </span>
                <div className="flex items-center gap-2">
                  {[0.85, 1.0, 1.15].map(speed => (
                    <button
                      key={speed}
                      onClick={() => handleSaveVoicePreferences(speed, voiceGender)}
                      className={`flex-1 py-1.5 text-xs text-center border font-mono transition-colors ${
                        voiceSpeed === speed
                          ? 'bg-[#2F6BFF] border-[#2F6BFF] text-white font-bold'
                          : 'bg-transparent border-[#20232b] text-[#8c919e] hover:text-white'
                      }`}
                    >
                      {speed === 0.85 ? '0.85x (Slow)' : speed === 1.0 ? '1.0x (Normal)' : '1.15x (Fast)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Voice Gender */}
              <div className="p-3 bg-[#090b0e] border border-[#20232b] space-y-2">
                <span className="text-[10px] text-[#8c919e] uppercase block font-bold">
                  Voice Tone / Gender
                </span>
                <div className="flex items-center gap-2">
                  {(['male', 'female'] as const).map(gender => (
                    <button
                      key={gender}
                      onClick={() => handleSaveVoicePreferences(voiceSpeed, gender)}
                      className={`flex-1 py-1.5 text-xs text-center border font-mono capitalize transition-colors ${
                        voiceGender === gender
                          ? 'bg-[#2F6BFF] border-[#2F6BFF] text-white font-bold'
                          : 'bg-transparent border-[#20232b] text-[#8c919e] hover:text-white'
                      }`}
                    >
                      {gender} Voice
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
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
