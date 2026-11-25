'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { api } from '../../lib/api';
import { resolveModel } from '../../lib/models';
import { FirestoreMessage } from '@bantai/shared';
import {
  Send,
  Mic,
  MicOff,
  Paperclip,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Terminal,
  Sparkles,
  FileCode2,
  Cpu,
  MessageSquare,
  Plus,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  PanelLeft,
  PanelLeftClose,
  Search
} from 'lucide-react';

const MAX_UPLOAD_BYTES = 512 * 1024;

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 code-block-surface border border-white/10 rounded-xl overflow-hidden shadow-lg">
      <div className="flex items-center justify-between px-3.5 py-2 bg-[#121222] border-b border-white/5 text-xs text-[#94a3b8]">
        <div className="flex items-center gap-2 font-mono">
          <FileCode2 size={14} className="text-[#22d3ee]" />
          <span className="uppercase text-[11px] tracking-wider">{language || 'code'}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-white transition-colors"
        >
          {copied ? <Check size={12} className="text-[#10b981]" /> : <Copy size={12} />}
          <span className="text-[11px]">{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="p-4 text-[13px] leading-relaxed font-mono text-[#e2e8f0] overflow-x-auto bg-[#0a0a14]">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function renderInlineFormatting(text: string): React.ReactNode {
  const tokens = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return tokens.map((token, index) => {
    if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
      return (
        <strong key={index} className="font-bold text-white">
          {token.slice(2, -2)}
        </strong>
      );
    }
    if (token.startsWith('`') && token.endsWith('`') && token.length > 2) {
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 mx-0.5 rounded bg-white/10 text-[#22d3ee] font-mono text-[12px]"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={index}>{token}</React.Fragment>;
  });
}

function FormattedContent({ content }: { content: string }) {
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-1.5 break-words text-[15px] leading-[1.7] text-[#e2e8f0]">
      {parts.map((part, i) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const lines = part.slice(3, -3).split('\n');
          const lang = lines[0]?.trim() || 'code';
          const code = lines.slice(1).join('\n');
          return <CodeBlock key={i} language={lang} code={code} />;
        }

        return (
          <div key={i} className="space-y-1.5">
            {part.split('\n').map((line, lineIdx) => {
              if (!line.trim()) return <div key={lineIdx} className="h-1.5" />;

              if (line.startsWith('### ')) {
                return (
                  <h4 key={lineIdx} className="text-base font-bold text-white mt-2">
                    {renderInlineFormatting(line.replace('### ', ''))}
                  </h4>
                );
              }
              if (line.startsWith('## ')) {
                return (
                  <h3 key={lineIdx} className="text-lg font-bold text-white mt-2.5">
                    {renderInlineFormatting(line.replace('## ', ''))}
                  </h3>
                );
              }

              if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                return (
                  <div key={lineIdx} className="flex items-start gap-2 pl-2">
                    <span className="text-[#6366f1] mt-1.5 w-1.5 h-1.5 rounded-full bg-[#6366f1] shrink-0" />
                    <span>{renderInlineFormatting(line.trim().slice(2))}</span>
                  </div>
                );
              }

              return <p key={lineIdx}>{renderInlineFormatting(line)}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
}

const SUGGESTION_CHIPS = [
  'Analyze architecture & performance bottlenecks',
  'Mera aaj ka briefing aur tasks bata bantai',
  'Write an Express middleware with rate limiting',
  'Summarize technical specs cleanly'
];

export function ChatView() {
  const {
    user,
    conversations,
    setConversations,
    activeConversationId,
    setActiveConversationId,
    personalityMode,
    selectedModel,
    refreshConversations
  } = useApp();

  const [messages, setMessages] = useState<FirestoreMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [attachedFile, setAttachedFile] = useState<{ name: string; content: string } | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, 'up' | 'down'>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Collapsible history drawer (collapsed by default on small screens)
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const currentModel = resolveModel(selectedModel);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setHistoryOpen(true);
    }
  }, []);

  useEffect(() => {
    if (activeConversationId) {
      api.getMessages(activeConversationId)
        .then(setMessages)
        .catch(() => setMessages([]));
    } else {
      setMessages([]);
    }
  }, [activeConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  const speakText = useCallback((text: string) => {
    if (!ttsEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const cleaned = text.replace(/```[\s\S]*?```/g, 'Code snippet included.').replace(/[*_#`]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleaned);
    utterance.rate = 1.05;
    window.speechSynthesis.speak(utterance);
  }, [ttsEnabled]);

  const handleNewChat = async () => {
    setChatError(null);
    setActiveConversationId(null);
    setMessages([]);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setHistoryOpen(false);
    }
    inputRef.current?.focus();
  };

  const handleDeleteConversation = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    try {
      await api.deleteConversation(convId);
      setConversations(prev => prev.filter(c => c.id !== convId));
      if (activeConversationId === convId) {
        setActiveConversationId(null);
        setMessages([]);
      }
    } catch (err) {
      setChatError((err as Error).message || 'Failed to delete conversation.');
    }
  };

  const handleFeedback = async (messageId: string, rating: 'up' | 'down') => {
    try {
      await api.sendFeedback(messageId, rating);
      setFeedbackMap(prev => ({ ...prev, [messageId]: rating }));
    } catch (err) {
      setChatError((err as Error).message || 'Failed to record feedback.');
    }
  };

  const handleSend = async (customPrompt?: string) => {
    const promptText = customPrompt ?? input.trim();
    if ((!promptText && !attachedFile) || isStreaming) return;

    setChatError(null);
    let finalContent = promptText;
    if (attachedFile && !customPrompt) {
      finalContent += `\n\n[Attached File: ${attachedFile.name}]\n\`\`\`\n${attachedFile.content}\n\`\`\``;
    }

    if (!customPrompt) {
      setInput('');
      setAttachedFile(null);
    }

    let convId = activeConversationId;
    if (!convId) {
      try {
        const newConv = await api.createConversation(
          finalContent.substring(0, 40) + (finalContent.length > 40 ? '...' : ''),
          personalityMode,
          selectedModel
        );
        convId = newConv.id;
        setActiveConversationId(convId);
      } catch (err) {
        setChatError((err as Error).message || 'Failed to start conversation.');
        return;
      }
    }

    const tempUserMsg: FirestoreMessage = {
      id: `temp-${Date.now()}`,
      conversationId: convId,
      userId: user?.userId || 'local',
      role: 'user',
      content: finalContent,
      personalityMode,
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, tempUserMsg]);
    setIsStreaming(true);
    setStreamingText('');

    let fullAssistantResponse = '';

    try {
      await api.streamMessage(
        convId,
        finalContent,
        personalityMode,
        selectedModel,
        chunk => {
          if (chunk.type === 'token' && chunk.content) {
            fullAssistantResponse += chunk.content;
            setStreamingText(fullAssistantResponse);
          } else if (chunk.type === 'error') {
            fullAssistantResponse += `\n[Error: ${chunk.error}]`;
            setStreamingText(fullAssistantResponse);
          }
        }
      );

      if (convId) {
        const synced = await api.getMessages(convId).catch(() => null);
        if (synced && synced.length > 0) {
          setMessages(synced);
        } else if (fullAssistantResponse) {
          setMessages(prev => [
            ...prev,
            {
              id: `assistant-${Date.now()}`,
              conversationId: convId!,
              userId: user?.userId || 'local',
              role: 'assistant',
              content: fullAssistantResponse,
              personalityMode,
              modelUsed: selectedModel,
              createdAt: new Date().toISOString()
            }
          ]);
        }
        refreshConversations();
      }
      if (ttsEnabled && fullAssistantResponse) {
        speakText(fullAssistantResponse);
      }
    } catch (err) {
      setChatError((err as Error).message || 'Stream interrupted.');
    } finally {
      setIsStreaming(false);
      setStreamingText('');
    }
  };

  const handleRegenerate = async () => {
    if (isStreaming || messages.length === 0) return;
    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    if (lastUser) {
      await handleSend(lastUser.content);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleRecording = () => {
    if (typeof window === 'undefined') return;
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setChatError('Speech recognition is not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.onresult = (event: any) => {
      const transcript = event.results[0]?.[0]?.transcript || '';
      if (transcript) setInput(prev => (prev ? `${prev} ${transcript}` : transcript));
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setChatError(null);

    if (file.size > MAX_UPLOAD_BYTES) {
      setChatError(`File "${file.name}" exceeds the 512 KB attachment limit.`);
      e.target.value = '';
      return;
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const reader = new FileReader();
    reader.onload = ev => {
      const content = typeof ev.target?.result === 'string' ? ev.target.result : '';
      setAttachedFile({ name: safeName, content });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const filteredConversations = conversations.filter(c =>
    (c.title || 'Untitled').toLowerCase().includes(historySearch.toLowerCase())
  );

  const lastAssistantIdx = messages.map(m => m.role).lastIndexOf('assistant');

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-[#07070f] text-white relative">
      {/* Ambient Radial Indigo Glow */}
      <div className="ambient-radial-bloom opacity-60 pointer-events-none" />

      {/* Collapsible Chat History Drawer */}
      {historyOpen && (
        <aside
          aria-label="Conversation History"
          className="w-64 shrink-0 bg-[#0b0b15] border-r border-white/5 flex flex-col h-full z-20"
        >
          <div className="p-3 border-b border-white/5 flex items-center justify-between gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-[#94a3b8]">
              Chats ({conversations.length})
            </span>
            <button
              type="button"
              onClick={handleNewChat}
              className="px-2.5 py-1 rounded-lg bg-[#6366f1] hover:bg-[#5558e6] text-white text-[11px] font-semibold flex items-center gap-1"
            >
              <Plus size={12} />
              <span>New</span>
            </button>
          </div>

          <div className="p-2.5 border-b border-white/5">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#64748b]" />
              <input
                type="text"
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
                placeholder="Search threads..."
                aria-label="Search conversation history"
                className="w-full bg-[#07070f] border border-white/10 rounded-lg pl-7 pr-2.5 py-1.5 text-[11px] text-white placeholder-[#64748b] focus:outline-none focus:border-[#6366f1]"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredConversations.length === 0 ? (
              <p className="text-[11px] text-[#64748b] text-center py-6">No conversations yet.</p>
            ) : (
              filteredConversations.map(conv => {
                const isActive = conv.id === activeConversationId;
                return (
                  <div
                    key={conv.id}
                    onClick={() => {
                      setActiveConversationId(conv.id);
                      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                        setHistoryOpen(false);
                      }
                    }}
                    className={`group flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-[#6366f1]/15 border border-[#6366f1]/40 text-white'
                        : 'hover:bg-white/[0.04] text-[#94a3b8] border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <MessageSquare size={13} className={isActive ? 'text-[#22d3ee] shrink-0' : 'text-[#64748b] shrink-0'} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{conv.title || 'New Chat'}</p>
                        <p className="text-[10px] font-mono text-[#64748b] truncate">
                          {conv.personalityMode} · {conv.modelId || 'bhai'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={e => handleDeleteConversation(e, conv.id)}
                      aria-label={`Delete conversation ${conv.title || conv.id}`}
                      title="Delete conversation"
                      className="opacity-70 sm:opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[#ef4444]/20 text-[#94a3b8] hover:text-[#f87171] transition-all shrink-0"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </aside>
      )}

      {/* Main Conversation Column */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative z-10">
        {/* Sub-Toolbar for History Toggle */}
        <div className="h-9 px-3 sm:px-5 flex items-center justify-between border-b border-white/5 bg-[#07070f]/80 shrink-0 text-[11px]">
          <button
            type="button"
            onClick={() => setHistoryOpen(o => !o)}
            aria-label="Toggle chat history"
            className="flex items-center gap-1.5 text-[#94a3b8] hover:text-white transition-colors"
          >
            {historyOpen ? <PanelLeftClose size={14} /> : <PanelLeft size={14} />}
            <span>{historyOpen ? 'Hide History' : `History (${conversations.length})`}</span>
          </button>

          <span className="font-mono text-[#64748b] truncate">
            {personalityMode} mode · {currentModel.shortName}
          </span>
        </div>

        {/* Scrollable Message Viewport */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-6 pt-5 pb-6 scroll-smooth">
          {chatError && (
            <div className="max-w-3xl mx-auto mb-4 p-3 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#fca5a5] text-xs">
              {chatError}
            </div>
          )}

          {messages.length === 0 && !streamingText ? (
            <div className="max-w-3xl mx-auto h-full flex flex-col items-center justify-center text-center pt-6 pb-8 px-4 space-y-6">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#0f0f1a] border border-white/10 flex items-center justify-center mx-auto shadow-[0_0_24px_-4px_rgba(99,102,241,0.4)]">
                  <Terminal size={24} className="text-[#6366f1]" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gradient-hero">
                  Apna Model. Apna Dimaag. Apna AI.
                </h1>
                <p className="text-sm text-[#94a3b8] max-w-md mx-auto leading-relaxed">
                  Direct local inference via{' '}
                  <span className="font-mono text-[#22d3ee]">{currentModel.name}</span>. Pure private compute without external APIs.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                {SUGGESTION_CHIPS.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(chip)}
                    className="p-3.5 text-left surface-raised hover:border-[#6366f1]/40 transition-all text-xs text-[#94a3b8] hover:text-white flex items-start gap-2.5 group"
                  >
                    <Sparkles size={14} className="text-[#6366f1] mt-0.5 shrink-0 group-hover:text-[#22d3ee] transition-colors" />
                    <span className="leading-snug">{chip}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-5">
              {messages.map((msg, idx) => {
                const isUser = msg.role === 'user';
                const fb = feedbackMap[msg.id];
                const isLastAssistant = !isUser && idx === lastAssistantIdx;

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.16, ease: 'easeOut' }}
                    className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {isUser ? (
                      <div className="bubble-user px-4 py-3 max-w-[85%] sm:max-w-[75%] text-sm whitespace-pre-wrap leading-relaxed">
                        {msg.content}
                      </div>
                    ) : (
                      <div className="w-full space-y-2">
                        <div className="flex items-center gap-2 text-xs text-[#64748b] font-mono">
                          <Cpu size={13} className="text-[#22d3ee]" />
                          <span className="font-semibold text-white/80">BANTAI</span>
                          {msg.modelUsed && (
                            <span className="telemetry-chip text-[10px]">
                              {resolveModel(msg.modelUsed).shortName}
                            </span>
                          )}
                        </div>

                        <div className="bubble-assistant p-4 sm:p-5">
                          <FormattedContent content={msg.content} />
                        </div>

                        {/* Message Actions: Feedback, Copy, Regenerate */}
                        <div className="flex items-center gap-2 pl-1 text-[#64748b]">
                          <button
                            type="button"
                            onClick={() => handleFeedback(msg.id, 'up')}
                            aria-label="Thumbs up feedback"
                            className={`p-1 rounded hover:bg-white/5 transition-colors ${
                              fb === 'up' ? 'text-[#10b981]' : 'hover:text-white'
                            }`}
                          >
                            <ThumbsUp size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFeedback(msg.id, 'down')}
                            aria-label="Thumbs down feedback"
                            className={`p-1 rounded hover:bg-white/5 transition-colors ${
                              fb === 'down' ? 'text-[#f87171]' : 'hover:text-white'
                            }`}
                          >
                            <ThumbsDown size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(msg.content).catch(() => {});
                              setCopiedId(msg.id);
                              setTimeout(() => setCopiedId(null), 1500);
                            }}
                            aria-label="Copy response"
                            className="p-1 rounded hover:bg-white/5 hover:text-white transition-colors"
                          >
                            {copiedId === msg.id ? <Check size={13} className="text-[#10b981]" /> : <Copy size={13} />}
                          </button>
                          {isLastAssistant && (
                            <button
                              type="button"
                              disabled={isStreaming}
                              onClick={handleRegenerate}
                              aria-label="Regenerate response"
                              className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-white/5 hover:text-white text-[11px] font-mono transition-colors disabled:opacity-40"
                            >
                              <RefreshCw size={12} />
                              <span>Regenerate</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}

              {streamingText && (
                <div className="w-full space-y-2">
                  <div className="flex items-center gap-2 text-xs text-[#64748b] font-mono">
                    <Cpu size={13} className="text-[#22d3ee] animate-pulse" />
                    <span className="font-semibold text-white/80">BANTAI</span>
                    <span className="text-[#22d3ee]">Streaming...</span>
                  </div>
                  <div className="bubble-assistant p-4 sm:p-5">
                    <FormattedContent content={streamingText} />
                    <span className="animate-cursor-blink" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Sticky Bottom Composer (Zero Fixed Sidebar Overlap) */}
        <div className="shrink-0 bg-gradient-to-t from-[#07070f] via-[#07070f] to-transparent pt-2 pb-4 px-3 sm:px-6 z-20">
          <div className="max-w-3xl mx-auto">
            {attachedFile && (
              <div className="mb-2 flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#0f0f1a] border border-[#22d3ee]/40 text-xs text-[#22d3ee]">
                <span className="truncate font-mono">{attachedFile.name}</span>
                <button
                  type="button"
                  onClick={() => setAttachedFile(null)}
                  className="text-white/60 hover:text-white ml-2 text-[11px]"
                >
                  Remove
                </button>
              </div>
            )}

            <div className="surface-floating rounded-2xl p-2 sm:p-2.5 flex items-end gap-2 border border-white/10 focus-within:border-[#6366f1]/50 transition-all">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.json,.csv,.log,.py,.ts,.tsx,.js"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Attach text file"
                className="p-2 rounded-xl text-[#94a3b8] hover:text-white hover:bg-white/5 transition-colors shrink-0"
              >
                <Paperclip size={18} />
              </button>

              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Message BANTAI (${personalityMode} mode)...`}
                aria-label="Chat message input"
                rows={1}
                className="flex-1 bg-transparent border-0 text-sm text-white placeholder-[#64748b] focus:outline-none resize-none max-h-36 py-2 px-1"
              />

              <button
                type="button"
                onClick={() => setTtsEnabled(t => !t)}
                aria-label={ttsEnabled ? 'Mute voice output' : 'Enable voice output'}
                className="p-2 rounded-xl text-[#94a3b8] hover:text-white hover:bg-white/5 transition-colors shrink-0"
              >
                {ttsEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>

              <button
                type="button"
                onClick={toggleRecording}
                aria-label={isRecording ? 'Stop voice input' : 'Start voice input'}
                className={`p-2 rounded-xl transition-colors shrink-0 ${
                  isRecording
                    ? 'bg-[#ef4444]/20 text-[#f87171]'
                    : 'text-[#94a3b8] hover:text-white hover:bg-white/5'
                }`}
              >
                {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
              </button>

              <button
                type="button"
                disabled={isStreaming || (!input.trim() && !attachedFile)}
                onClick={() => handleSend()}
                aria-label="Send message"
                className="p-2.5 rounded-xl bg-[#6366f1] hover:bg-[#5558e6] disabled:opacity-40 text-white transition-colors shrink-0"
              >
                <Send size={17} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
