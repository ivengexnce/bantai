'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { resolveModel, APP_MODELS } from '../../lib/models';
import { api } from '../../lib/api';
import { Cpu, ShieldCheck, ChevronDown, Check, MessageSquare } from 'lucide-react';
import { PersonalityMode } from '@bantai/shared';

const PERSONALITIES: Array<{ id: PersonalityMode; label: string }> = [
  { id: 'tapori', label: 'Tapori' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'professional', label: 'Professional' },
  { id: 'developer', label: 'Developer' },
  { id: 'academic', label: 'Academic' }
];

export function GlassIrisTopBar() {
  const {
    user,
    personalityMode,
    setPersonalityMode,
    selectedModel,
    setSelectedModel,
    conversations
  } = useApp();

  const [modelOpen, setModelOpen] = useState(false);
  const [backendHealth, setBackendHealth] = useState<{
    provider: string;
    isAlive: boolean;
    availableModels: string[];
  }>({ provider: 'checking', isAlive: false, availableModels: [] });

  const modelRef = useRef<HTMLDivElement>(null);
  const currentModel = resolveModel(selectedModel);

  useEffect(() => {
    api.getHealth()
      .then(res => {
        if (res?.aiEngine) setBackendHealth(res.aiEngine);
      })
      .catch(() => setBackendHealth({ provider: 'offline', isAlive: false, availableModels: [] }));
  }, []);

  useEffect(() => {
    if (!modelOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (modelRef.current && !modelRef.current.contains(e.target as Node)) {
        setModelOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [modelOpen]);

  return (
    <header className="h-12 px-3 sm:px-5 flex items-center justify-between gap-2 sm:gap-4 z-30 select-none shrink-0 bg-[#07070f] border-b border-white/5 relative">
      {/* Left: BANTAI Wordmark + Model Badge */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
        <span className="font-bold tracking-tight text-white text-sm">BANTAI</span>
        <span className="text-white/20 hidden sm:inline">/</span>

        <div ref={modelRef} className="relative">
          <button
            type="button"
            onClick={() => setModelOpen(o => !o)}
            aria-haspopup="listbox"
            aria-expanded={modelOpen}
            className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#0f0f1a] hover:bg-[#16162a] border border-white/10 text-xs transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#6366f1] shadow-[0_0_8px_#6366f1]" />
            <span className="font-semibold text-white">{currentModel.name}</span>
            <span className="hidden sm:inline font-mono text-[10px] text-[#22d3ee] bg-[#22d3ee]/10 px-1 py-0.5 rounded">
              {currentModel.parameters}
            </span>
            <ChevronDown size={14} className={`text-[#64748b] transition-transform ${modelOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {modelOpen && (
              <motion.div
                role="listbox"
                initial={{ opacity: 0, y: -4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.97 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute left-0 top-full mt-2 w-72 p-2 rounded-xl surface-floating z-50 space-y-1"
              >
                <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-[#64748b] border-b border-white/5 mb-1 flex justify-between">
                  <span>Local Models</span>
                  <span className={backendHealth.isAlive ? 'text-[#10b981]' : 'text-amber-400'}>
                    {backendHealth.isAlive ? `${backendHealth.provider} live` : 'fallback engine'}
                  </span>
                </div>
                {APP_MODELS.map(m => {
                  const active = m.id === selectedModel;
                  return (
                    <button
                      type="button"
                      key={m.id}
                      role="option"
                      aria-selected={active}
                      onClick={() => {
                        setSelectedModel(m.id);
                        setModelOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-left transition-colors ${
                        active
                          ? 'bg-[#6366f1]/15 text-white border border-[#6366f1]/30'
                          : 'text-[#94a3b8] hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <div>
                        <div className="font-medium text-white flex items-center gap-1.5">
                          <span>{m.name}</span>
                          <span className="font-mono text-[10px] text-[#64748b]">({m.parameters})</span>
                        </div>
                        <div className="text-[10px] font-mono text-[#64748b]">{m.ramRequirement} RAM · {m.vramRequirement} VRAM</div>
                      </div>
                      {active && <Check size={16} className="text-[#6366f1]" />}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Right: Runtime Status + Personality Switcher + Real Session Telemetry */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#10b981]/10 border border-[#10b981]/25">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10b981] shadow-[0_0_8px_#10b981]" />
          </span>
          <span className="text-[10px] font-mono font-semibold tracking-wider uppercase text-[#10b981]">
            {backendHealth.isAlive ? `${backendHealth.provider} Active` : 'Local Engine'}
          </span>
        </div>

        <div className="hidden lg:flex items-center bg-[#0f0f1a] p-1 rounded-full border border-white/5 relative">
          {PERSONALITIES.map(p => {
            const isActive = personalityMode === p.id;
            return (
              <button
                type="button"
                key={p.id}
                onClick={() => setPersonalityMode(p.id)}
                className={`relative px-3 py-1 rounded-full text-xs font-medium transition-colors z-10 ${
                  isActive ? 'text-white' : 'text-[#64748b] hover:text-[#94a3b8]'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activePersonalityPill"
                    className="absolute inset-0 bg-[#6366f1] rounded-full shadow-[0_0_14px_rgba(99,102,241,0.5)] z-[-1]"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                {p.label}
              </button>
            );
          })}
        </div>

        <div className="hidden xl:flex items-center gap-2">
          <div className="telemetry-chip">
            <MessageSquare size={12} className="text-[#64748b]" />
            <span>{conversations.length} Chats</span>
          </div>
          <div className="telemetry-chip border-[#6366f1]/30 text-[#e2e8f0]">
            <ShieldCheck size={12} className={user?.mfaEnabled ? 'text-[#10b981]' : 'text-[#22d3ee]'} />
            <span>{user?.mfaEnabled ? 'MFA Protected' : 'HttpOnly Cookie'}</span>
          </div>
          <div className="telemetry-chip">
            <Cpu size={12} className="text-[#64748b]" />
            <span>{currentModel.baseModel}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
