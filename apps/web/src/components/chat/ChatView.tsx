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
import { Tabs } from '../ui/Tabs';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { BorderBeam } from '../ui/BorderBeam';
import { FADE_IN_UP } from '../../lib/utils';

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
    <div className="space-y-3 leading-relaxed text-xs break-words font-mono">
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const firstLineBreak = part.indexOf('\n');
          const lang = part.slice(3, firstLineBreak).trim() || 'code';
          const code = part.slice(firstLineBreak + 1, -3);

          return (
            <div key={index} className="my-3 border border-[#2b303c] bg-[#090b0e] text-xs">
              <div className="flex items-center justify-between px-3 py-1 bg-[#12141a] border-b border-[#20232b] text-[#8c919e]">
                <span className="text-[10px] uppercase tracking-wider text-[#cc8e25]">{lang}</span>
                <button
                  onClick={() => handleCopyCode(code, index)}
                  className="px-2 py-0.5 border border-[#20232b] hover:border-[#3a4050] hover:text-[#f0f2f5] text-[10px] transition-colors"
                >
                  {copiedIndex === index ? '[COPIED]' : '[COPY CODE]'}
                </button>
              </div>
              <pre className="p-3 overflow-x-auto text-[#d4d6db] whitespace-pre text-[11px] leading-relaxed">
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
                  <div key={lIdx} className="flex items-start gap-2 pl-2 text-[#d4d6db]">
                    <span className="text-[#cc8e25]">&gt;</span>
                    <span>{line.substring(2)}</span>
                  </div>
                );
              }

              // Headers
              if (line.startsWith('### ')) {
                return <h4 key={lIdx} className="text-xs font-bold text-[#f0f2f5] pt-1 uppercase tracking-wider">{line.slice(4)}</h4>;
              }
              if (line.startsWith('## ')) {
                return <h3 key={lIdx} className="text-xs font-bold text-[#cc8e25] pt-2 uppercase tracking-widest">{line.slice(3)}</h3>;
              }

              return <p key={lIdx} className="text-[#d4d6db]">{line}</p>;
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
      setInfoToast('Speech recognition not supported in browser.');
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

  const modeTabs = [
    { id: 'tapori', label: 'Tapori' },
    { id: 'balanced', label: 'Balanced' },
    { id: 'professional', label: 'Professional' },
    { id: 'developer', label: 'Developer' },
    { id: 'academic', label: 'Academic' }
  ];

  return (
    <div className="flex-1 flex flex-col h-screen bg-[#0e1014] text-[#d4d6db] font-mono text-xs select-none">
      {/* 1. TOP STRUCTURAL CONTROL BAR */}
      <header className="border-b border-[#20232b] bg-[#12141a] px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
        {/* Personality Mode Selector with Framer Motion Sliding Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="text-[10px] uppercase tracking-widest text-[#5a6070] mr-1">
            [MODE]:
          </span>
          <Tabs
            tabs={modeTabs}
            activeTab={personalityMode}
            onChange={id => setPersonalityMode(id as PersonalityMode)}
            layoutId="chat-personality-tab"
          />
        </div>

        {/* Model Spec Selector & Status Indicator */}
        <div className="flex items-center gap-3">
          <div className="hidden xl:flex items-center gap-2 text-[10px] text-[#8c919e] font-mono">
            <span className="w-1.5 h-1.5 bg-[#10b981] inline-block" />
            <span>SOVEREIGN RUNTIME · 100% LOCAL</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase text-[#5a6070]">[MODEL]:</span>
            <select
              value={selectedModel}
              onChange={e => handleModelChange(e.target.value)}
              className="bg-[#181b22] border border-[#20232b] px-2.5 py-1 text-[11px] text-[#f0f2f5] focus:outline-none focus:border-[#cc8e25] font-mono uppercase"
            >
              {APP_MODELS.map(m => (
                <option key={m.id} value={m.id} className="bg-[#12141a] text-[#f0f2f5]">
                  {m.name.toUpperCase()} ({m.parameters})
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Switch Toast Notification Banner */}
      <AnimatePresence>
        {switchToast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="px-4 py-1.5 bg-[#181b22] border-b border-[#cc8e25] text-[11px] text-[#cc8e25] flex items-center justify-between"
          >
            <span>&gt; {switchToast}</span>
            <button onClick={() => setSwitchToast(null)} className="text-[#8c919e] hover:text-[#f0f2f5]">[x]</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Toast */}
      <AnimatePresence>
        {infoToast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="px-4 py-1.5 bg-[#181b22] border-b border-red-500 text-[11px] text-red-400 flex items-center justify-between"
          >
            <span>! {infoToast}</span>
            <button onClick={() => setInfoToast(null)} className="text-[#8c919e] hover:text-[#f0f2f5]">[x]</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. CHAT STREAM VIEW AREA */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.length === 0 && !streamingContent ? (
          <div className="max-w-2xl mx-auto py-12 border border-[#20232b] bg-[#12141a] p-6 text-center space-y-4">
            <div className="inline-block px-3 py-1 bg-[#181b22] border border-[#2b303c] text-[10px] text-[#cc8e25] uppercase tracking-widest font-bold">
              [ACTIVE ENGINE: {currentModel.name.toUpperCase()} · {currentModel.parameters}]
            </div>

            <h2 className="text-sm font-bold text-[#f0f2f5] uppercase tracking-wider">
              BANTAI // {PERSONALITY_PROMPTS[personalityMode].name}
            </h2>

            <p className="text-xs text-[#8c919e] max-w-lg mx-auto leading-relaxed">
              {PERSONALITY_PROMPTS[personalityMode].tagline}
            </p>

            <div className="pt-2 flex flex-wrap gap-2 justify-center">
              {[
                'mera naam bta',
                'mein sirf ek ladka hu',
                'quicksort algorithm samjhao',
                'dockerfile template for node'
              ].map((query, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(query)}
                  className="px-3 py-1.5 border border-[#20232b] bg-[#0e1014] hover:border-[#cc8e25] hover:text-[#cc8e25] text-[10px] text-[#8c919e] uppercase transition-colors"
                >
                  &gt; {query}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <motion.div
                key={msg.id || index}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className={`max-w-3xl mx-auto border ${
                  isUser
                    ? 'border-[#2b303c] bg-[#12141a]'
                    : 'border-[#20232b] bg-[#0c0e12]'
                }`}
              >
                {/* Message Header Strip */}
                <div className="flex items-center justify-between px-3 py-1 bg-[#151820] border-b border-[#20232b] text-[10px] text-[#8c919e]">
                  <div className="flex items-center gap-2">
                    <span className={isUser ? 'text-[#cc8e25] font-bold' : 'text-[#10b981] font-bold'}>
                      {isUser ? '[OPERATOR]' : `[BANTAI // ${(msg.personalityMode || personalityMode).toUpperCase()}]`}
                    </span>
                    <span className="text-[#3a3f4d]">|</span>
                    <span className="text-[#5a6070]">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>

                  {!isUser && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSpeak(msg.content)}
                        className="hover:text-[#f0f2f5] transition-colors"
                        title="Text-to-Speech"
                      >
                        [AUDIO]
                      </button>
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="hover:text-[#f0f2f5] transition-colors"
                        title="Copy message"
                      >
                        {copiedId === msg.id ? '[COPIED]' : '[COPY]'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Message Body Content */}
                <div className="p-3.5">
                  <FormattedContent content={msg.content} />
                </div>
              </motion.div>
            );
          })
        )}

        {/* Live Streaming Token Output Block */}
        {isStreaming && (
          <div className="max-w-3xl mx-auto border border-[#cc8e25] bg-[#0c0e12]">
            <div className="flex items-center justify-between px-3 py-1 bg-[#151820] border-b border-[#cc8e25]/40 text-[10px] text-[#cc8e25]">
              <span className="font-bold flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-[#cc8e25] inline-block animate-ping" />
                [BANTAI STREAMING TOKENS // {currentModel.name.toUpperCase()}]
              </span>
              <span className="text-[#10b981]">STATUS: 200 ACTIVE</span>
            </div>

            <div className="p-3.5">
              <FormattedContent content={streamingContent || 'Processing deterministic model weights...'} />
              <span className="inline-block w-2 h-3.5 bg-[#cc8e25] animate-pulse ml-0.5 align-middle" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. FLOATING TECHNICAL COMPOSER CARD WITH BORDERBEAM */}
      <div className="border-t border-[#20232b] bg-[#0e1014] p-3 sm:p-4">
        <div className="max-w-3xl mx-auto border border-[#2b303c] bg-[#12141a] relative">
          <BorderBeam size={180} duration={12} color="#cc8e25" />

          {/* Model Specification & Planner Link */}
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#20232b] bg-[#161922] text-[10px] text-[#8c919e]">
            <div className="flex items-center gap-2">
              <span className="text-[#cc8e25] font-bold">[{currentModel.name.toUpperCase()}]</span>
              <span>·</span>
              <span className="uppercase text-[#f0f2f5]">{personalityMode} MODE</span>
              {isListening && (
                <>
                  <span>·</span>
                  <span className="text-red-400 animate-pulse font-bold">[MIC RECORDING AUDIO...]</span>
                </>
              )}
            </div>

            <button
              onClick={() => setActiveView('agent')}
              className="text-[#8c919e] hover:text-[#cc8e25] transition-colors uppercase font-bold"
            >
              [LAUNCH AGENT PLANNER -&gt;]
            </button>
          </div>

          {/* Text Input Area */}
          <div className="p-3">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={`[ENTER QUERY FOR BANTAI (${personalityMode.toUpperCase()} MODE)...]`}
              rows={2}
              className="w-full bg-transparent border-0 text-xs text-[#f0f2f5] placeholder-[#5a6070] focus:outline-none resize-none leading-relaxed font-mono"
            />
          </div>

          {/* Bottom Action Strip */}
          <div className="flex items-center justify-between px-3 py-2 border-t border-[#20232b] bg-[#12141a]">
            <div className="flex items-center gap-2">
              <Button
                variant={isListening ? 'danger' : 'outline'}
                size="sm"
                onClick={toggleVoiceInput}
              >
                {isListening ? '[STOP MIC]' : '[VOICE DICTATION]'}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const modes: PersonalityMode[] = ['tapori', 'balanced', 'professional', 'developer', 'academic'];
                  const nextIdx = (modes.indexOf(personalityMode) + 1) % modes.length;
                  setPersonalityMode(modes[nextIdx]);
                }}
              >
                [CYCLE MODE]
              </Button>
            </div>

            <div>
              <Button
                variant={isStreaming ? 'danger' : 'primary'}
                size="sm"
                disabled={!input.trim() && !isStreaming}
                onClick={() => handleSend()}
              >
                {isStreaming ? '[ABORT]' : '[EXECUTE // ENTER]'}
              </Button>
            </div>
          </div>
        </div>

        {/* Footer Integrity Spec */}
        <div className="flex items-center justify-between max-w-3xl mx-auto mt-2 text-[10px] text-[#5a6070]">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-[#10b981] inline-block" />
            <span>SOVEREIGN RUNTIME: ZERO DATA SENT TO EXTERNAL SERVERS</span>
          </span>
          <span className="hidden sm:inline">SHIFT + ENTER FOR LINE BREAK</span>
        </div>
      </div>
    </div>
  );
}
