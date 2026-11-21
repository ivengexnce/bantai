'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../lib/api';
import {
  PersonalityMode,
  FirestoreMessage,
  SUPPORTED_MODELS,
  PERSONALITY_PROMPTS,
  resolveModel
} from '@bantai/shared';
import {
  Send,
  ArrowUp,
  Sparkles,
  Bot,
  User,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  Volume2,
  Square,
  Mic,
  MicOff,
  Flame,
  Code2,
  Briefcase,
  GraduationCap,
  Smile,
  Cpu,
  Info
} from 'lucide-react';

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
    <div className="space-y-3 leading-relaxed text-sm break-words font-sans">
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const firstLineBreak = part.indexOf('\n');
          const lang = part.slice(3, firstLineBreak).trim() || 'code';
          const code = part.slice(firstLineBreak + 1, -3);

          return (
            <div key={index} className="my-3 rounded-xl overflow-hidden border border-bantai-darkBorder bg-[#08090d] shadow-md font-mono text-xs">
              <div className="flex items-center justify-between px-3.5 py-1.5 bg-white/5 border-b border-white/5 text-gray-400">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-bantai-400">{lang}</span>
                <button
                  onClick={() => handleCopyCode(code, index)}
                  className="flex items-center gap-1 hover:text-white transition px-2 py-0.5 rounded hover:bg-white/5"
                  title="Copy code"
                >
                  {copiedIndex === index ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[10px] text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span className="text-[10px]">Copy code</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3.5 overflow-x-auto text-gray-200 whitespace-pre">
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
              if (!line.trim()) return <div key={lIdx} className="h-1" />;

              // Bullet points
              if (line.startsWith('- ') || line.startsWith('* ')) {
                return (
                  <div key={lIdx} className="flex items-start gap-2 pl-2">
                    <span className="text-bantai-400 font-bold">•</span>
                    <span>{line.substring(2)}</span>
                  </div>
                );
              }

              // Headers
              if (line.startsWith('### ')) {
                return <h4 key={lIdx} className="text-sm font-bold text-white pt-1">{line.slice(4)}</h4>;
              }
              if (line.startsWith('## ')) {
                return <h3 key={lIdx} className="text-base font-bold text-white pt-2">{line.slice(3)}</h3>;
              }

              return <p key={lIdx}>{line}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
}

export function ChatView() {
  const {
    activeConversationId,
    setActiveConversationId,
    setConversations,
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
  const [switchToast, setSwitchToast] = useState<string | null>(null);
  const [infoToast, setInfoToast] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentModel = resolveModel(selectedModel);

  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    const model = resolveModel(modelId);
    if (model) {
      setSwitchToast(model.switchMessage);
      setTimeout(() => setSwitchToast(null), 3500);
    }
  };

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
    setIsStreaming(true);
    setStreamingContent('');

    // Append optimistic user message
    const tempUserMsg: FirestoreMessage = {
      id: `temp_user_${Date.now()}`,
      conversationId: targetConvId,
      userId: 'current',
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
          content: `Bantai, thoda error aa gaya: ${(err as Error).message}. Dobara try mar!`,
          personalityMode,
          createdAt: new Date().toISOString()
        }
      ]);
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
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
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      setInfoToast('Voice recognition is not supported in this browser.');
      setTimeout(() => setInfoToast(null), 3000);
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'hi-IN';
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setInput(prev => (prev ? `${prev} ${transcript}` : transcript));
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  const modeIcons: Record<PersonalityMode, React.ReactNode> = {
    tapori: <Flame className="w-3.5 h-3.5 text-amber-400" />,
    balanced: <Smile className="w-3.5 h-3.5 text-blue-400" />,
    professional: <Briefcase className="w-3.5 h-3.5 text-emerald-400" />,
    developer: <Code2 className="w-3.5 h-3.5 text-purple-400" />,
    academic: <GraduationCap className="w-3.5 h-3.5 text-sky-400" />
  };

  return (
    <div className="flex-1 flex flex-col h-screen bg-bantai-dark">
      {/* Top Header Controls */}
      <header className="h-14 border-b border-bantai-darkBorder px-6 flex items-center justify-between bg-bantai-darkCard/50 backdrop-blur-md">
        {/* Personality Mode Selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {(Object.keys(PERSONALITY_PROMPTS) as PersonalityMode[]).map(mode => {
            const isSelected = personalityMode === mode;
            return (
              <button
                key={mode}
                onClick={() => setPersonalityMode(mode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                  isSelected
                    ? 'bg-bantai-500 text-black font-semibold shadow-sm shadow-bantai-500/20'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10'
                }`}
                title={PERSONALITY_PROMPTS[mode].description}
              >
                {modeIcons[mode]}
                <span className="capitalize">{mode}</span>
              </button>
            );
          })}
        </div>

        {/* Model Selector Dropdown & Sovereign Badge */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-semibold text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            100% Sovereign (Zero Third-Party APIs)
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={selectedModel}
                onChange={e => handleModelChange(e.target.value)}
                className="bg-black/60 border border-bantai-darkBorder hover:border-bantai-500/60 rounded-xl px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:border-bantai-500 shadow-sm transition appearance-none pr-8 cursor-pointer"
              >
                {SUPPORTED_MODELS.map(m => (
                  <option key={m.id} value={m.id} className="bg-bantai-darkCard text-white py-1">
                    {m.icon} {m.name} ({m.baseModel}) {m.isDefault ? '★' : ''}
                  </option>
                ))}
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-xs">
                ▾
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Switch Notification Message Banner */}
      {switchToast && (
        <div className="px-6 py-2 bg-gradient-to-r from-bantai-500/20 via-black to-bantai-500/20 border-b border-bantai-500/30 text-xs font-medium text-bantai-300 flex items-center justify-center gap-2 animate-fadeIn">
          <Sparkles className="w-3.5 h-3.5 text-bantai-400" />
          <span>{switchToast}</span>
        </div>
      )}

      {infoToast && (
        <div className="px-6 py-2 bg-blue-950/40 border-b border-blue-500/30 text-xs text-blue-300 flex items-center justify-center gap-2">
          <Info className="w-3.5 h-3.5" />
          <span>{infoToast}</span>
        </div>
      )}

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 && !streamingContent ? (
          <div className="max-w-2xl mx-auto my-8 text-center space-y-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-bantai-500/20 border border-bantai-500/40 text-bantai-400 shadow-inner">
              <Sparkles className="w-8 h-8" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/60 border border-white/10 text-xs font-semibold mb-3 shadow-sm">
                <span className="text-base">{currentModel.icon}</span>
                <span className="text-white font-bold">{currentModel.name}</span>
                <span className="text-gray-500">·</span>
                <span className="text-bantai-400 font-normal italic">&quot;{currentModel.tagline}&quot;</span>
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                {PERSONALITY_PROMPTS[personalityMode].name}
              </h2>
              <p className="text-sm text-bantai-400 font-medium mt-1">
                {PERSONALITY_PROMPTS[personalityMode].tagline}
              </p>
              <p className="text-xs text-gray-400 mt-2 max-w-md mx-auto">
                {PERSONALITY_PROMPTS[personalityMode].exampleGreeting}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-4 text-left">
              {[
                'Apun ko samjha QuickSort algorithm Mumbai tapori style me!',
                'Write a production-grade TypeScript debounce utility function',
                'Schedule a team review meeting for tomorrow 11:00 AM',
                'Explain how BANTAI fine-tunes open-weight models using QLoRA'
              ].map((starter, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(starter)}
                  className="p-3 bg-white/5 hover:bg-white/10 border border-bantai-darkBorder rounded-xl text-xs text-gray-300 hover:text-white transition text-left"
                >
                  {starter}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map(msg => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-3xl mx-auto ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-bantai-500/20 border border-bantai-500/40 text-bantai-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div className={`relative group max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                  isUser
                    ? 'bg-bantai-500 text-black font-medium rounded-tr-sm shadow-md'
                    : 'bg-bantai-darkCard border border-bantai-darkBorder text-gray-200 rounded-tl-sm shadow-sm'
                }`}>
                  <FormattedContent content={msg.content} />

                  {!isUser && (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5 text-gray-400 text-xs">
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="hover:text-white transition flex items-center gap-1"
                        title="Copy text"
                      >
                        {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleSpeak(msg.content)}
                        className="hover:text-white transition flex items-center gap-1"
                        title="Listen"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => api.sendFeedback(msg.id, 'up')}
                        className="hover:text-emerald-400 transition"
                        title="Helpful response"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => api.sendFeedback(msg.id, 'down')}
                        className="hover:text-red-400 transition"
                        title="Needs improvement"
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-white/10 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Live Streaming Assistant Output */}
        {isStreaming && streamingContent && (
          <div className="flex gap-3 max-w-3xl mx-auto justify-start">
            <div className="w-8 h-8 rounded-xl bg-bantai-500/20 border border-bantai-500/40 text-bantai-400 flex items-center justify-center flex-shrink-0 mt-0.5 animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm bg-bantai-darkCard border border-bantai-500/40 text-gray-200 rounded-tl-sm shadow-sm">
              <FormattedContent content={streamingContent} />
              <span className="inline-block w-1.5 h-4 ml-1 bg-bantai-400 animate-pulse align-middle" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Modern Floating Composer Card */}
      <div className="p-4 border-t border-bantai-darkBorder/60 bg-gradient-to-t from-black via-bantai-darkBg/95 to-transparent backdrop-blur-md">
        <div className="max-w-3xl mx-auto">
          <div className="relative rounded-2xl border border-white/10 bg-[#10131d]/90 shadow-2xl transition-all duration-200 focus-within:border-bantai-500/60 focus-within:ring-2 focus-within:ring-bantai-500/15">
            {/* Top Bar inside composer: Model Badge, Status Pill, Mode Indicator */}
            <div className="flex items-center justify-between px-3.5 pt-2.5 pb-1 text-xs border-b border-white/[0.04]">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-300 font-medium text-[11px]">
                  <span>{currentModel?.icon || '🤝'}</span>
                  <span className="text-white">{currentModel?.name || 'BANTAI Bhai'}</span>
                  <span className="text-gray-500">•</span>
                  <span className="text-bantai-400 font-semibold capitalize">{personalityMode}</span>
                </span>
                {isListening && (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-[11px] animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    Listening...
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setActiveView('agent')}
                className="hidden sm:flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-bantai-400 transition"
                title="Launch Autonomous Agent Planner"
              >
                <Cpu className="w-3.5 h-3.5 text-bantai-400" />
                <span>Agent Planner</span>
              </button>
            </div>

            {/* Input Textarea */}
            <div className="px-3.5 pt-2.5 pb-1">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={`Ask ${currentModel?.shortName || currentModel?.name || 'BANTAI'} anything (${personalityMode} mode)...`}
                rows={2}
                className="w-full bg-transparent border-0 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-0 resize-none max-h-36 leading-relaxed"
              />
            </div>

            {/* Bottom Actions inside Composer */}
            <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  className={`p-2 rounded-xl transition ${
                    isListening
                      ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                      : 'hover:bg-white/5 text-gray-400 hover:text-white'
                  }`}
                  title="Speech-to-text (Voice Input)"
                >
                  {isListening ? <MicOff className="w-4 h-4 animate-pulse" /> : <Mic className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const modes: PersonalityMode[] = ['tapori', 'balanced', 'professional', 'developer', 'academic'];
                    const nextIdx = (modes.indexOf(personalityMode) + 1) % modes.length;
                    setPersonalityMode(modes[nextIdx]);
                  }}
                  className="px-2 py-1 rounded-lg text-[11px] text-gray-400 hover:text-white hover:bg-white/5 transition flex items-center gap-1"
                  title="Cycle personality mode"
                >
                  <Sparkles className="w-3 h-3 text-bantai-400" />
                  <span>Mode: <strong className="text-gray-200 capitalize">{personalityMode}</strong></span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() && !isStreaming}
                  className={`p-2 rounded-xl flex items-center justify-center transition-all duration-200 shadow-md ${
                    isStreaming
                      ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20'
                      : input.trim()
                      ? 'bg-bantai-500 hover:bg-bantai-400 text-black shadow-bantai-500/30'
                      : 'bg-white/10 text-gray-500 cursor-not-allowed'
                  }`}
                  title={isStreaming ? 'Stop generation' : 'Send message (Enter)'}
                >
                  {isStreaming ? (
                    <Square className="w-4 h-4 fill-current" />
                  ) : (
                    <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Footer sovereignty pill */}
          <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              <span>100% Sovereign · Zero External AI APIs · Private Memory Active</span>
            </span>
            <span className="hidden sm:inline text-gray-500">
              Shift + Enter for new line
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
