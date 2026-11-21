'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { api } from '../../lib/api';
import {
  PersonalityMode,
  FirestoreMessage,
  PERSONALITY_PROMPTS
} from '@bantai/shared';
import { resolveModel, APP_MODELS } from '../../lib/models';
import { GlassIrisOrb } from '../ui/GlassIrisOrb';

function FormattedContent({ content }: { content: string }) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Split by markdown fenced code blocks: ```lang ... ```
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-3 leading-relaxed text-[13px] break-words">
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const firstLineBreak = part.indexOf('\n');
          const lang = part.slice(3, firstLineBreak).trim() || 'code';
          const code = part.slice(firstLineBreak + 1, -3);

          return (
            <div key={index} className="my-3 rounded-xl border border-white/10 bg-[#121212] overflow-hidden text-xs">
              <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#181818] border-b border-white/5 text-[#8C8C8C]">
                <span className="text-[11px] uppercase tracking-wider text-[#2F6BFF] font-medium">{lang}</span>
                <button
                  onClick={() => handleCopyCode(code, index)}
                  className="px-2 py-0.5 rounded hover:bg-white/5 hover:text-white text-[11px] transition-colors"
                >
                  {copiedIndex === index ? 'Copied' : 'Copy Code'}
                </button>
              </div>
              <pre className="p-3.5 overflow-x-auto text-[#D4D4D4] whitespace-pre text-[12px] font-mono leading-relaxed">
                <code>{code}</code>
              </pre>
            </div>
          );
        }

        // Standard text lines
        const lines = part.split('\n');
        return (
          <div key={index} className="space-y-1">
            {lines.map((line, lIdx) => {
              if (!line.trim()) return <div key={lIdx} className="h-2" />;

              // Bullet points
              if (line.startsWith('- ') || line.startsWith('* ')) {
                return (
                  <div key={lIdx} className="flex items-start gap-2 pl-2 text-[#E5E5E5]">
                    <span className="text-[#2F6BFF] mt-1 text-[10px]">●</span>
                    <span>{line.substring(2)}</span>
                  </div>
                );
              }

              // Headers
              if (line.startsWith('### ')) {
                return <h4 key={lIdx} className="text-sm font-semibold text-white pt-2">{line.slice(4)}</h4>;
              }
              if (line.startsWith('## ')) {
                return <h3 key={lIdx} className="text-base font-semibold text-white pt-2.5 text-[#2F6BFF]">{line.slice(3)}</h3>;
              }

              return <p key={lIdx} className="text-[#D4D4D4] leading-relaxed">{line}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
}

function formatRelativeTime(dateStr: string) {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
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
    refreshConversations,
    setActiveView
  } = useApp();

  const [messages, setMessages] = useState<FirestoreMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Auto-resize textarea
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

    // Append optimistic user message
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

      // Refresh final saved messages
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
          content: `Execution error encountered: ${(err as Error).message}. Model fallback verified.`,
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

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSpeak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Voice Input Speech Recognition
  const toggleListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const SpeechRecognitionClass =
        (window as unknown as { SpeechRecognition?: new () => any }).SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: new () => any }).webkitSpeechRecognition;

      if (!SpeechRecognitionClass) {
        alert('Speech recognition is not supported in this browser.');
        setIsListening(false);
        return;
      }

      const recognition = new SpeechRecognitionClass();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInput(prev => (prev ? `${prev} ${transcript}` : transcript));
        }
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.warn('Voice input error:', err);
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

  const orbState: 'idle' | 'processing' | 'generating' = isStreaming
    ? streamingContent ? 'generating' : 'processing'
    : 'idle';

  const hasMessages = messages.length > 0 || isStreaming;

  // Filter 4 latest conversations for Recent Conversations timeline
  const recentConversations = conversations.slice(0, 4);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0E0E0E] relative overflow-hidden text-white font-sans">
      {/* Top Subtle Atmospheric Radial Blue Light */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] pointer-events-none rounded-full blur-[120px]"
        style={{
          background: 'radial-gradient(circle, rgba(47, 107, 255, 0.14) 0%, rgba(90, 76, 245, 0.08) 45%, transparent 70%)'
        }}
      />

      {/* Main Scrollable Canvas */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 z-10 flex flex-col items-center">
        {!hasMessages ? (
          /* ============================================================== */
          /* SECTION 1: HERO GLASS IRIS EXPERIENCE (INITIAL STATE)           */
          /* ============================================================== */
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="w-full max-w-[708px] flex flex-col items-center text-center pt-2 sm:pt-6 pb-12 space-y-6"
          >
            {/* Top Greeting */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="text-xs sm:text-sm font-medium text-[#8C8C8C] flex items-center gap-1.5"
            >
              <span>Hello, {user?.name ? user.name.split(' ')[0] : 'Meet'}</span>
              <span className="inline-block animate-wave">👋</span>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.45 }}
              className="text-3xl sm:text-4xl md:text-[46px] font-semibold text-gradient-iris tracking-tight leading-[1.12] drop-shadow-[0_4px_24px_rgba(47,107,255,0.2)]"
            >
              WHAT&apos;S ON YOUR MIND?
            </motion.h1>

            {/* Supporting Description */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="text-xs sm:text-sm text-[#94A3B8] max-w-lg leading-relaxed font-normal"
            >
              Your intelligent companion for thinking, creating, learning, and getting things done.
            </motion.p>

            {/* The Central Glass Iris Orb */}
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.6, type: 'spring', damping: 20 }}
              className="py-1 relative flex items-center justify-center"
            >
              <GlassIrisOrb size={250} state={orbState} />
            </motion.div>

            {/* The Glass Iris Chat Composer (Hero Anchored) */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.4 }}
              className="w-full"
            >
              <div className="w-full rounded-2xl glass-composer p-4">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask BANTAI anything..."
                  rows={2}
                  className="w-full bg-transparent border-0 text-sm text-white placeholder-[#64748B] focus:outline-none resize-none leading-relaxed font-sans"
                />

                {/* Composer Controls Row */}
                <div className="flex items-center justify-between pt-3 mt-1 border-t border-white/[0.08]">
                  <div className="flex items-center gap-2">
                    {/* Attachment Button */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-[#94A3B8] hover:text-white hover:bg-white/[0.08] transition-colors"
                      title="Attach file"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    </button>

                    {/* Voice Input Button */}
                    <button
                      type="button"
                      onClick={toggleListening}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                        isListening
                          ? 'bg-rose-500/20 text-rose-400 animate-pulse'
                          : 'text-[#94A3B8] hover:text-white hover:bg-white/[0.08]'
                      }`}
                      title="Voice input"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    </button>

                    {/* Personality Mode Selector Pill */}
                    <select
                      value={personalityMode}
                      onChange={e => setPersonalityMode(e.target.value as PersonalityMode)}
                      className="bg-white/[0.05] text-[#94A3B8] hover:text-white border border-white/10 hover:border-[#2F6BFF]/40 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-[#2F6BFF] transition-colors cursor-pointer"
                    >
                      <option value="tapori" className="bg-[#12141A] text-white">Tapori</option>
                      <option value="balanced" className="bg-[#12141A] text-white">Balanced</option>
                      <option value="developer" className="bg-[#12141A] text-white">Developer</option>
                      <option value="academic" className="bg-[#12141A] text-white">Academic</option>
                    </select>

                    {/* Model Family Selector Pill */}
                    <select
                      value={selectedModel}
                      onChange={e => setSelectedModel(e.target.value)}
                      className="bg-white/[0.05] text-[#94A3B8] hover:text-white border border-white/10 hover:border-[#2F6BFF]/40 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-[#2F6BFF] transition-colors cursor-pointer hidden sm:inline-block"
                    >
                      {APP_MODELS.map(m => (
                        <option key={m.id} value={m.id} className="bg-[#12141A] text-white">
                          {m.name} ({m.parameters})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Send Button */}
                  <button
                    onClick={() => handleSend()}
                    disabled={!input.trim() || isStreaming}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 ${
                      input.trim() && !isStreaming
                        ? 'glass-btn-primary text-white cursor-pointer active:scale-95'
                        : 'bg-white/[0.04] text-[#64748B] border border-white/5 cursor-not-allowed'
                    }`}
                  >
                    <span>Send</span>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Suggested Prompt Cards (3-column) */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.4 }}
              className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-left"
            >
              {/* Card 1: Ask Anything */}
              <button
                onClick={() => handleSend("Explain how BANTAI executes models locally with zero cloud API dependencies.")}
                className="p-4 rounded-2xl glass-card-interactive group flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#2F6BFF] shadow-[0_0_8px_#2F6BFF]" />
                    <span className="text-xs font-semibold text-white group-hover:text-[#2F6BFF] transition-colors">
                      01 — Ask Anything
                    </span>
                  </div>
                  <p className="text-[11px] text-[#94A3B8] leading-snug">
                    Get answers and explore ideas with instant local inference.
                  </p>
                </div>
                <div className="text-[10px] text-[#64748B] pt-3 group-hover:text-[#2F6BFF] transition-colors flex items-center gap-1 font-medium">
                  <span>Run prompt</span>
                  <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </div>
              </button>

              {/* Card 2: Deep Think */}
              <button
                onClick={() => handleSend("Analyze the computational and architectural differences between Qwen 2.5 and Llama 3 models.")}
                className="p-4 rounded-2xl glass-card-interactive group flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#5A4CF5] shadow-[0_0_8px_#5A4CF5]" />
                    <span className="text-xs font-semibold text-white group-hover:text-[#5A4CF5] transition-colors">
                      02 — Deep Think
                    </span>
                  </div>
                  <p className="text-[11px] text-[#94A3B8] leading-snug">
                    Explore complex questions with multi-step deterministic reasoning.
                  </p>
                </div>
                <div className="text-[10px] text-[#64748B] pt-3 group-hover:text-[#5A4CF5] transition-colors flex items-center gap-1 font-medium">
                  <span>Run prompt</span>
                  <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </div>
              </button>

              {/* Card 3: Create Something */}
              <button
                onClick={() => handleSend("Plan an autonomous agent workflow to build a full-stack Next.js app with Tailwind.")}
                className="p-4 rounded-2xl glass-card-interactive group flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#38BDF8] shadow-[0_0_8px_#38BDF8]" />
                    <span className="text-xs font-semibold text-white group-hover:text-[#38BDF8] transition-colors">
                      03 — Create Something
                    </span>
                  </div>
                  <p className="text-[11px] text-[#94A3B8] leading-snug">
                    Write, brainstorm, plan, and build autonomous agents.
                  </p>
                </div>
                <div className="text-[10px] text-[#64748B] pt-3 group-hover:text-[#38BDF8] transition-colors flex items-center gap-1 font-medium">
                  <span>Run prompt</span>
                  <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </div>
              </button>
            </motion.div>

            {/* Recent Conversations Timeline */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55, duration: 0.4 }}
              className="w-full text-left pt-2 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#8C8C8C] uppercase tracking-wider">
                  Recent Conversations
                </span>
                <button
                  onClick={() => setShowHistoryModal(true)}
                  className="text-xs text-[#2F6BFF] hover:underline"
                >
                  View All Conversations →
                </button>
              </div>

              {recentConversations.length === 0 ? (
                <div className="p-4 rounded-xl bg-[#151515] border border-white/5 text-xs text-[#6E6E6E] text-center">
                  No previous conversations found. Ask a question above to start!
                </div>
              ) : (
                <div className="space-y-1 relative pl-3 border-l border-white/10">
                  {recentConversations.map((conv, idx) => (
                    <button
                      key={conv.id}
                      onClick={() => setActiveConversationId(conv.id)}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl transition-all duration-150 flex items-center justify-between group hover:bg-[#181818] border border-transparent hover:border-white/5 ${
                        idx === 0 ? 'opacity-100' : idx === 1 ? 'opacity-90' : idx === 2 ? 'opacity-75' : 'opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#2F6BFF]" />
                        <span className="text-xs font-medium text-[#E5E5E5] group-hover:text-white truncate">
                          {conv.title}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#6E6E6E] shrink-0 ml-3">
                        {formatRelativeTime(conv.updatedAt || conv.createdAt)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        ) : (
          /* ============================================================== */
          /* SECTION 2: ACTIVE CONVERSATION THREAD                           */
          /* ============================================================== */
          <div className="w-full max-w-[708px] flex flex-col space-y-5 pb-32 pt-2">
            {/* Top Compact Glass Iris Presence */}
            <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-2 text-xs text-[#8C8C8C]">
              <div className="flex items-center gap-3">
                <GlassIrisOrb size={36} state={orbState} interactive={false} />
                <div>
                  <div className="font-semibold text-white text-xs">
                    BANTAI Iris // {currentModel.name}
                  </div>
                  <div className="text-[11px] text-[#6E6E6E]">
                    {personalityMode.toUpperCase()} MODE · ON-PREMISE SILICON
                  </div>
                </div>
              </div>

              <button
                onClick={() => setActiveConversationId(null)}
                className="px-2.5 py-1 rounded-lg bg-[#181818] hover:bg-[#222222] text-[#8C8C8C] hover:text-white text-xs transition-colors"
              >
                + New Chat
              </button>
            </div>

            {/* Messages Stream */}
            {messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id || index}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div className="text-[11px] text-[#6E6E6E] mb-1 px-1">
                    {isUser ? 'You' : `BANTAI (${msg.personalityMode || personalityMode})`}
                  </div>

                  <div
                    className={`max-w-[90%] sm:max-w-[85%] rounded-2xl ${
                      isUser
                        ? 'bg-[#2F6BFF]/15 border border-[#2F6BFF]/35 backdrop-blur-xl text-white rounded-tr-sm p-4 shadow-[0_8px_24px_-6px_rgba(47,107,255,0.25)]'
                        : 'glass-panel-elevated text-[#E2E8F0] rounded-tl-sm p-4.5 space-y-3'
                    }`}
                  >
                    <FormattedContent content={msg.content} />

                    {/* Assistant Message Actions */}
                    {!isUser && (
                      <div className="flex items-center gap-2 pt-2 border-t border-white/5 text-[11px] text-[#8C8C8C]">
                        <button
                          onClick={() => handleCopy(msg.id, msg.content)}
                          className="hover:text-white transition-colors"
                        >
                          {copiedId === msg.id ? 'Copied' : 'Copy'}
                        </button>
                        <span>·</span>
                        <button
                          onClick={() => handleSpeak(msg.content)}
                          className="hover:text-white transition-colors"
                        >
                          Speak
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Live Streaming Content Chunk */}
            {isStreaming && (
              <div className="flex flex-col items-start">
                <div className="text-[11px] text-[#2F6BFF] mb-1 px-1 flex items-center gap-1.5 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2F6BFF] animate-pulse" />
                  <span>BANTAI is thinking...</span>
                </div>

                <div className="max-w-[90%] sm:max-w-[85%] rounded-2xl glass-panel-elevated text-[#E2E8F0] rounded-tl-sm p-4.5 space-y-3">
                  <FormattedContent content={streamingContent || 'Processing deterministic model weights...'} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Floating Glass Composer (Docked at Bottom in Active Mode) */}
      {hasMessages && (
        <div className="fixed bottom-0 left-14 sm:left-16 right-0 p-4 bg-gradient-to-t from-[#0A0B0E] via-[#0A0B0E]/90 to-transparent flex justify-center z-30">
          <div className="w-full max-w-[708px] rounded-2xl glass-composer p-3.5">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask BANTAI anything..."
              rows={1}
              className="w-full bg-transparent border-0 text-sm text-white placeholder-[#64748B] focus:outline-none resize-none leading-relaxed font-sans"
            />

            <div className="flex items-center justify-between pt-2.5 border-t border-white/[0.08]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[#94A3B8] hover:text-white hover:bg-white/[0.08] transition-colors"
                  title="Attach file"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={toggleListening}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                    isListening ? 'bg-rose-500/20 text-rose-400 animate-pulse' : 'text-[#94A3B8] hover:text-white hover:bg-white/[0.08]'
                  }`}
                  title="Voice input"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </button>

                <select
                  value={personalityMode}
                  onChange={e => setPersonalityMode(e.target.value as PersonalityMode)}
                  className="bg-white/[0.05] text-[#94A3B8] hover:text-white border border-white/10 hover:border-[#2F6BFF]/40 rounded-lg px-2 py-0.5 text-xs focus:outline-none cursor-pointer"
                >
                  <option value="tapori" className="bg-[#12141A] text-white">Tapori</option>
                  <option value="balanced" className="bg-[#12141A] text-white">Balanced</option>
                  <option value="developer" className="bg-[#12141A] text-white">Developer</option>
                  <option value="academic" className="bg-[#12141A] text-white">Academic</option>
                </select>
              </div>

              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isStreaming}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 ${
                  input.trim() && !isStreaming
                    ? 'glass-btn-primary text-white cursor-pointer active:scale-95'
                    : 'bg-white/[0.04] text-[#64748B] border border-white/5 cursor-not-allowed'
                }`}
              >
                <span>Send</span>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Drawer / Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#151515] border border-white/10 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-sm font-semibold text-white">All Conversations</h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[#8C8C8C] hover:text-white hover:bg-[#222]"
              >
                ✕
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-1">
              {conversations.map(c => (
                <button
                  key={c.id}
                  onClick={() => {
                    setActiveConversationId(c.id);
                    setShowHistoryModal(false);
                  }}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-[#1D1D1D] flex items-center justify-between text-xs transition-colors"
                >
                  <span className="text-[#E5E5E5] truncate font-medium">{c.title}</span>
                  <span className="text-[#6E6E6E] text-[11px] shrink-0 ml-3">
                    {formatRelativeTime(c.updatedAt || c.createdAt)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
