'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { api } from '../../lib/api';
import {
  PersonalityMode,
  FirestoreMessage
} from '@bantai/shared';
import { resolveModel, APP_MODELS } from '../../lib/models';
import { speakText, stopSpeaking, createSpeechRecognizer } from '../../lib/voiceEngine';
import {
  Zap,
  Layers,
  Bug,
  Cpu,
  ArrowUp,
  Paperclip,
  Mic,
  Copy,
  Check,
  Volume2,
  VolumeX,
  ShieldAlert,
  Code2,
  Terminal,
  Clock,
  Sparkles
} from 'lucide-react';

interface ToolInvocation {
  tool: string;
  input: string;
  result: string;
  requiresAuth?: boolean;
}

function renderFormattedLine(text: string) {
  const segments = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return segments.map((seg, i) => {
    if (seg.startsWith('**') && seg.endsWith('**')) {
      return (
        <strong key={i} className="text-white font-semibold">
          {seg.slice(2, -2)}
        </strong>
      );
    }
    if (seg.startsWith('`') && seg.endsWith('`')) {
      return (
        <code key={i} className="px-1.5 py-0.5 rounded bg-white/10 text-[#22d3ee] font-mono text-xs">
          {seg.slice(1, -1)}
        </code>
      );
    }
    return seg;
  });
}

function FormattedContent({ content }: { content: string }) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-3 leading-[1.7] text-[13.5px] break-words">
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const firstLineBreak = part.indexOf('\n');
          const lang = part.slice(3, firstLineBreak).trim() || 'code';
          const code = part.slice(firstLineBreak + 1, -3);

          return (
            <div key={index} className="my-3 code-block-surface shadow-lg">
              <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#0e0e18] border-b border-white/5 text-[#94a3b8]">
                <div className="flex items-center gap-2">
                  <Code2 size={14} className="text-[#22d3ee]" />
                  <span className="text-[11px] uppercase tracking-wider text-[#22d3ee] font-mono font-medium">{lang}</span>
                </div>
                <button
                  onClick={() => handleCopyCode(code, index)}
                  className="px-2 py-0.5 rounded hover:bg-white/10 text-[#94a3b8] hover:text-white text-[11px] font-mono transition-colors flex items-center gap-1.5"
                >
                  {copiedIndex === index ? (
                    <>
                      <Check size={12} className="text-emerald-400" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 overflow-x-auto text-[#e2e8f0] whitespace-pre text-[12px] font-mono leading-relaxed bg-[#07070f]">
                <code>{code}</code>
              </pre>
            </div>
          );
        }

        const lines = part.split('\n');
        return (
          <div key={index} className="space-y-1.5">
            {lines.map((line, lIdx) => {
              if (!line.trim()) return <div key={lIdx} className="h-2" />;

              const numMatch = line.match(/^(\d+)\.\s+(.*)/);
              if (numMatch) {
                return (
                  <div key={lIdx} className="flex items-start gap-2.5 pl-2 text-[#e2e8f0]">
                    <span className="text-[#6366f1] font-mono text-[11px] font-semibold mt-0.5 shrink-0">
                      {numMatch[1]}.
                    </span>
                    <span className="leading-relaxed">{renderFormattedLine(numMatch[2])}</span>
                  </div>
                );
              }

              if (line.startsWith('- ') || line.startsWith('* ')) {
                return (
                  <div key={lIdx} className="flex items-start gap-2.5 pl-2 text-[#e2e8f0]">
                    <span className="text-[#6366f1] mt-1 text-[8px] shrink-0">◆</span>
                    <span className="leading-relaxed">{renderFormattedLine(line.substring(2))}</span>
                  </div>
                );
              }

              if (line.startsWith('### ')) {
                return <h4 key={lIdx} className="text-sm font-semibold text-white pt-2.5 tracking-tight">{renderFormattedLine(line.slice(4))}</h4>;
              }
              if (line.startsWith('## ')) {
                return <h3 key={lIdx} className="text-base font-bold text-white pt-3 tracking-tight text-[#22d3ee]">{renderFormattedLine(line.slice(3))}</h3>;
              }

              return <p key={lIdx} className="text-[#cbd5e1] leading-relaxed">{renderFormattedLine(line)}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
}

export function ChatView() {
  const {
    user,
    conversations,
    setConversations,
    activeConversationId,
    setActiveConversationId,
    personalityMode,
    setPersonalityMode,
    selectedModel,
    setSelectedModel,
    refreshConversations
  } = useApp();

  const [messages, setMessages] = useState<FirestoreMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isMonoComposer, setIsMonoComposer] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  // Authorization Gate State
  const [authGate, setAuthGate] = useState<{
    isOpen: boolean;
    toolName: string;
    actionDescription: string;
    parameters: string;
    onAuthorize: () => void;
    onReject: () => void;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeSpeakerRef = useRef<{ stop: () => void } | null>(null);
  const recognitionRef = useRef<any>(null);

  const currentModel = resolveModel(selectedModel);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (activeConversationId) {
      api.getMessages(activeConversationId)
        .then(setMessages)
        .catch(console.error);
    } else {
      setMessages([]);
    }
  }, [activeConversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  const handleSend = async (customPrompt?: string) => {
    const textToSend = (customPrompt || input).trim();
    if (!textToSend || isStreaming) return;

    let targetConvId = activeConversationId;
    if (!targetConvId) {
      try {
        const newConv = await api.createConversation(
          textToSend.substring(0, 32),
          personalityMode,
          selectedModel
        );
        setConversations(prev => [newConv, ...prev]);
        setActiveConversationId(newConv.id);
        targetConvId = newConv.id;
      } catch (err) {
        console.error('Failed to create conversation:', err);
        return;
      }
    }

    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setIsStreaming(true);
    setStreamingContent('');

    const tempUserMsg: FirestoreMessage = {
      id: `temp_user_${Date.now()}`,
      conversationId: targetConvId,
      userId: user?.userId || 'current',
      role: 'user',
      content: textToSend,
      personalityMode,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      let accumulated = '';
      await api.streamMessage(
        targetConvId,
        textToSend,
        personalityMode,
        selectedModel,
        chunk => {
          if (chunk.type === 'token' && chunk.content) {
            accumulated += chunk.content;
            setStreamingContent(accumulated);
          }
        }
      );

      const updatedMessages = await api.getMessages(targetConvId);
      setMessages(updatedMessages);
      refreshConversations();
    } catch (err) {
      console.error('Streaming error:', err);
      setMessages(prev => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          conversationId: targetConvId || 'default',
          userId: 'system',
          role: 'assistant',
          content: `Silicon Runtime Warning: ${(err as Error).message}. Offline deterministic fallback active.`,
          personalityMode,
          createdAt: new Date().toISOString()
        }
      ]);
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    return () => {
      stopSpeaking();
      try {
        recognitionRef.current?.stop();
      } catch {}
    };
  }, []);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSpeak = (id: string, text: string) => {
    if (speakingMessageId === id) {
      activeSpeakerRef.current?.stop();
      stopSpeaking();
      setSpeakingMessageId(null);
      return;
    }

    activeSpeakerRef.current?.stop();
    stopSpeaking();
    setSpeakingMessageId(id);

    activeSpeakerRef.current = speakText(text, {
      mode: personalityMode,
      gender: user?.preferences?.voiceGender || 'male',
      rate: user?.preferences?.voiceSpeed || (personalityMode === 'tapori' ? 1.05 : 1.0),
      onStart: () => setSpeakingMessageId(id),
      onEnd: () => setSpeakingMessageId(null),
      onError: () => setSpeakingMessageId(null)
    });
  };

  const toggleListening = () => {
    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {}
      setIsListening(false);
      return;
    }

    const recognizer = createSpeechRecognizer({
      mode: personalityMode,
      onStart: () => setIsListening(true),
      onEnd: () => setIsListening(false),
      onError: (err) => {
        console.warn('Voice input error:', err);
        setIsListening(false);
      },
      onInterimResult: (interim) => {
        if (interim) {
          setInput(prev => {
            const base = prev.replace(/\s*\(listening\.\.\.\)\s*$/, '').trim();
            return base ? `${base} ${interim}` : interim;
          });
        }
      },
      onFinalResult: (final) => {
        if (final) {
          setInput(prev => {
            const base = prev.trim();
            return base ? `${base} ${final}` : final;
          });
        }
      }
    });

    if (!recognizer) return;
    recognitionRef.current = recognizer;
    try {
      recognizer.start();
    } catch {
      setIsListening(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      setInput(prev => (prev ? `${prev}\n\n[File: ${file.name}]\n${text.slice(0, 1500)}` : `[File: ${file.name}]\n${text.slice(0, 1500)}`));
    };
    reader.readAsText(file);
  };

  const hasMessages = messages.length > 0 || isStreaming;

  // 4 Prompt Suggestion Cards (2x2 grid)
  const PROMPTS = [
    {
      title: 'Street-Smart DSA',
      desc: 'QuickSort ko tapori style mein samjha with dry-run, time complexity, and edge cases.',
      icon: Zap,
      accent: 'text-[#6366f1]'
    },
    {
      title: 'System Architecture Review',
      desc: 'Design an air-gapped dual-database architecture for local vectors and conversations.',
      icon: Layers,
      accent: 'text-[#22d3ee]'
    },
    {
      title: 'Deep System Debug',
      desc: 'Memory leak debug karne ka step-by-step checklist for Node.js event emitters.',
      icon: Bug,
      accent: 'text-amber-400'
    },
    {
      title: 'QLoRA Fine-Tuning',
      desc: 'Explain QLoRA fine-tuning with 4-bit NF4 quantization on an RTX A2000 4GB GPU.',
      icon: Cpu,
      accent: 'text-[#6366f1]'
    }
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#07070f] relative overflow-hidden text-white font-sans">
      {/* Ambient Radial Bloom in Indigo/Violet Centered Behind Main Content */}
      <div className="ambient-radial-bloom" />

      {/* Main Centered Scrollable Viewport (Max width 760px) */}
      <div className="flex-1 overflow-y-auto px-6 py-6 z-10 flex flex-col items-center">
        {!hasMessages ? (
          /* ============================================================== */
          /* EMPTY STATE — VERTICALLY & HORIZONTALLY CENTERED               */
          /* ============================================================== */
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full max-w-[760px] my-auto flex flex-col items-center text-center space-y-8 py-10"
          >
            {/* 48px Large Gradient Headline */}
            <div className="space-y-2">
              <h1 className="text-4xl md:text-[48px] font-extrabold tracking-tight leading-[1.1] text-gradient-hero">
                Apna Model. Apna Dimaag. Apna AI.
              </h1>
              <p className="text-sm font-mono text-[#64748b]">
                Zero OpenAI. Zero Anthropic. Zero Gemini. Seedha apna model.
              </p>
            </div>

            {/* 4 Prompt Cards in a 2x2 Grid */}
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-3.5 text-left">
              {PROMPTS.map((p, idx) => {
                const Icon = p.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSend(p.desc)}
                    className="p-4 rounded-card surface-raised hover:-translate-y-0.5 transition-all text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <div className={`p-1.5 rounded-lg bg-white/5 ${p.accent}`}>
                        <Icon size={18} />
                      </div>
                      <span className="text-xs font-semibold text-white group-hover:text-[#6366f1] transition-colors">
                        {p.title}
                      </span>
                    </div>
                    <p className="text-xs text-[#94a3b8] leading-relaxed line-clamp-2">
                      {p.desc}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Hardware Status Strip: Chhotu / Bhai */}
            <div className="w-full pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {APP_MODELS.map(m => {
                  const isCurrent = m.id === selectedModel;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelectedModel(m.id)}
                      className={`p-3 rounded-card text-left transition-all ${
                        isCurrent
                          ? 'bg-[#16162a] border border-[#6366f1]/50 shadow-[0_0_16px_-4px_rgba(99,102,241,0.4)]'
                          : 'bg-[#0f0f1a] border border-white/5 hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-white">{m.name}</span>
                        <span className="font-mono text-[10px] text-[#22d3ee]">{m.parameters}</span>
                      </div>
                      <div className="text-[10px] font-mono text-[#64748b]">{m.ramRequirement} RAM · {m.hardware || 'Local'}</div>
                      <div className="text-[10px] text-[#94a3b8] mt-1 truncate">{m.tagline}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        ) : (
          /* ============================================================== */
          /* CONVERSATION STATE — MAX-WIDTH 760PX CENTERED                  */
          /* ============================================================== */
          <div className="w-full max-w-[760px] flex flex-col space-y-6 pb-36 pt-2">
            {messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              return (
                <motion.div
                  key={msg.id || index}
                  initial={{ opacity: 0, x: isUser ? 8 : -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className={`flex flex-col group ${isUser ? 'items-end' : 'items-start'}`}
                >
                  {/* Timestamp & Hover Label */}
                  <div className="text-[10px] font-mono text-[#64748b] mb-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
                    <Clock size={10} />
                    <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <div
                    className={`max-w-[85%] ${
                      isUser
                        ? 'bubble-user p-4 text-white text-[13.5px]'
                        : 'bubble-assistant p-5 surface-raised w-full space-y-3'
                    }`}
                  >
                    {!isUser && (
                      <div className="flex items-center justify-between pb-2 border-b border-white/5 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full bg-[#6366f1]/15 text-[#6366f1] border border-[#6366f1]/30 font-mono text-[10px] font-semibold uppercase">
                            BANTAI · {msg.personalityMode || personalityMode}
                          </span>
                          <span className="text-[11px] font-mono text-[#64748b]">RTX A2000 Silicon</span>
                        </div>
                        <div className="flex items-center gap-2 text-[#94a3b8]">
                          <button
                            onClick={() => handleCopy(msg.id, msg.content)}
                            aria-label="Copy message"
                            className="p-1 hover:text-white transition-colors"
                          >
                            {copiedId === msg.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                          </button>
                          <button
                            onClick={() => handleSpeak(msg.id, msg.content)}
                            aria-label="Read message aloud"
                            className="p-1 hover:text-white transition-colors"
                          >
                            {speakingMessageId === msg.id ? <VolumeX size={14} className="text-[#6366f1]" /> : <Volume2 size={14} />}
                          </button>
                        </div>
                      </div>
                    )}

                    <FormattedContent content={msg.content} />
                  </div>
                </motion.div>
              );
            })}

            {/* Live Streaming State */}
            {isStreaming && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col items-start w-full max-w-[85%]"
              >
                <div className="text-[10px] font-mono text-[#22d3ee] mb-1 px-1 flex items-center gap-1.5">
                  <Sparkles size={12} className="animate-spin" />
                  <span>Synthesizing tokens locally...</span>
                </div>
                <div className="bubble-assistant p-5 surface-raised w-full text-[13.5px]">
                  <FormattedContent content={streamingContent || 'Thinking...'} />
                  <span className="animate-cursor-blink" />
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ============================================================== */}
      /* COMPOSER — FLOATING GLASS PANEL PINNED TO BOTTOM               */
      /* ============================================================== */
      <div className="fixed bottom-0 left-16 right-0 p-5 bg-gradient-to-t from-[#07070f] via-[#07070f]/95 to-transparent flex justify-center z-30">
        <div className="w-full max-w-[760px] rounded-card glass-panel p-3.5 transition-all focus-within:border-[#6366f1]/50 focus-within:shadow-[0_0_24px_-4px_rgba(99,102,241,0.4)]">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask BANTAI anything in English, Hindi, or Tapori..."
            rows={1}
            className={`w-full bg-transparent border-0 text-sm text-white placeholder-[#64748b] focus:outline-none resize-none leading-relaxed ${
              isMonoComposer ? 'font-mono' : 'font-sans'
            }`}
          />

          <div className="flex items-center justify-between pt-2.5 border-t border-white/5">
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Attach file"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#94a3b8] hover:text-white hover:bg-white/5 transition-colors"
              >
                <Paperclip size={18} />
              </button>

              <button
                type="button"
                onClick={toggleListening}
                aria-label="Voice input"
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  isListening
                    ? 'bg-rose-500/20 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.4)]'
                    : 'text-[#94a3b8] hover:text-white hover:bg-white/5'
                }`}
              >
                <Mic size={18} />
              </button>

              <button
                type="button"
                onClick={() => setIsMonoComposer(v => !v)}
                aria-label="Toggle Monospace Mode"
                className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                  isMonoComposer ? 'bg-[#6366f1]/20 text-[#22d3ee] border border-[#22d3ee]/30' : 'text-[#64748b] hover:text-white'
                }`}
                title="Toggle Monospace Editor"
              >
                Mono
              </button>
            </div>

            <div className="flex items-center gap-3">
              {/* Active Personality Pill */}
              <button
                onClick={() => {
                  const modes: PersonalityMode[] = ['tapori', 'balanced', 'professional', 'developer', 'academic'];
                  const nextIdx = (modes.indexOf(personalityMode) + 1) % modes.length;
                  setPersonalityMode(modes[nextIdx]);
                }}
                className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-[11px] font-mono text-[#94a3b8] hover:text-white border border-white/5 transition-colors"
                title="Click to cycle personality mode"
              >
                Mode: <span className="text-[#6366f1] font-semibold capitalize">{personalityMode}</span>
              </button>

              {/* Send Button */}
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isStreaming}
                aria-label="Send message"
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  input.trim() && !isStreaming
                    ? 'bg-[#6366f1] text-white shadow-[0_0_16px_#6366f1] active:scale-95'
                    : 'bg-white/5 text-[#64748b] cursor-not-allowed'
                }`}
              >
                <ArrowUp size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      /* AUTHORIZATION GATE MODAL (WHEN TOOL REQUIRES HUMAN APPROVAL)    */
      /* ============================================================== */
      <AnimatePresence>
        {authGate?.isOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-lg surface-floating border border-amber-500/40 p-6 space-y-5 shadow-[0_0_35px_-5px_rgba(245,158,11,0.35)]"
            >
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  <ShieldAlert size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">Security Authorization Gate</h3>
                  <p className="text-xs text-[#94a3b8]">Human-in-the-loop permission required</p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="font-mono text-[#64748b] uppercase tracking-wider text-[10px]">Tool Name:</span>
                  <div className="text-white font-mono font-semibold text-sm mt-0.5">{authGate.toolName}</div>
                </div>

                <div>
                  <span className="font-mono text-[#64748b] uppercase tracking-wider text-[10px]">Action Description:</span>
                  <div className="text-[#e2e8f0] mt-0.5">{authGate.actionDescription}</div>
                </div>

                <div>
                  <span className="font-mono text-[#64748b] uppercase tracking-wider text-[10px]">Exact Parameters:</span>
                  <pre className="p-3 mt-1 rounded-lg bg-[#07070f] border border-white/5 text-[#22d3ee] font-mono text-[11px] overflow-x-auto">
                    {authGate.parameters}
                  </pre>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
                <button
                  onClick={() => {
                    authGate.onReject();
                    setAuthGate(null);
                  }}
                  className="px-4 py-2 rounded-button bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 font-medium text-xs border border-rose-500/30 transition-colors"
                >
                  Reject & Abort
                </button>
                <button
                  onClick={() => {
                    authGate.onAuthorize();
                    setAuthGate(null);
                  }}
                  className="px-4 py-2 rounded-button bg-[#6366f1] hover:bg-[#6366f1]/90 text-white font-medium text-xs shadow-[0_0_16px_rgba(99,102,241,0.5)] transition-all"
                >
                  Authorize Execution
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
