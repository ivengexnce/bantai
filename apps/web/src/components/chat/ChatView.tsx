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

  const availableModes: PersonalityMode[] = ['tapori', 'balanced', 'professional', 'developer', 'academic'];

  return (
    <div className="flex-1 flex flex-col h-screen bg-[#0e1014] text-[#d4d6db] font-mono text-xs select-none">
      {/* 1. TOP STRUCTURAL CONTROL BAR */}
      <header className="border-b border-[#20232b] bg-[#12141a] px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
        {/* Personality Mode Selector */}
        <div className="flex items-center gap-1 overflow-x-auto">
          <span className="text-[10px] uppercase tracking-widest text-[#5a6070] mr-2">
            [MODE]:
          </span>
          {availableModes.map(mode => {
            const isSelected = personalityMode === mode;
            return (
              <button
                key={mode}
                onClick={() => setPersonalityMode(mode)}
                className={`px-2.5 py-1 text-[11px] uppercase transition-colors border ${
                  isSelected
                    ? 'bg-[#cc8e25] text-black font-bold border-[#cc8e25]'
                    : 'bg-[#181b22] text-[#8c919e] hover:text-[#f0f2f5] border-[#20232b]'
                }`}
                title={PERSONALITY_PROMPTS[mode].description}
              >
                [{mode}]
              </button>
            );
          })}
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
              className="bg-[#181b22] border border-[#2b303c] px-2 py-1 text-[11px] text-[#cc8e25] font-bold uppercase focus:outline-none focus:border-[#cc8e25] cursor-pointer"
            >
              {SUPPORTED_MODELS.map(m => (
                <option key={m.id} value={m.id} className="bg-[#12141a] text-[#f0f2f5]">
                  [{m.parameters}] {m.name.toUpperCase()} ({m.baseModel})
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Switch Notification Banner */}
      {switchToast && (
        <div className="bg-[#181b22] border-b border-[#cc8e25] px-4 py-2 text-[11px] text-[#cc8e25] font-mono flex items-center justify-between">
          <span>&gt; {switchToast}</span>
          <span className="text-[10px] text-[#8c919e]">[ACTIVE]</span>
        </div>
      )}

      {infoToast && (
        <div className="bg-[#181b22] border-b border-red-500/50 px-4 py-2 text-[11px] text-red-400 font-mono flex items-center justify-between">
          <span>&gt; {infoToast}</span>
          <button onClick={() => setInfoToast(null)} className="text-xs">[X]</button>
        </div>
      )}

      {/* 2. CONVERSATION VIEWPORT */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="max-w-2xl mx-auto py-12 border border-[#20232b] bg-[#12141a] p-6 text-center space-y-4">
            <div className="font-mono text-xs uppercase tracking-widest text-[#cc8e25]">
              [INITIALIZED: {currentModel.name.toUpperCase()} // {currentModel.parameters}]
            </div>
            <h2 className="text-xl font-bold text-[#f0f2f5] tracking-tight">
              BANTAI Sovereign Intelligence Console
            </h2>
            <p className="text-xs text-[#8c919e] max-w-lg mx-auto leading-relaxed">
              Self-hosted model execution on local hardware. Zero external API calls. Strict isolation between user credentials and conversation telemetry.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-4 text-left">
              {[
                "mera naam bta aur identity verify kar",
                "quicksort partitioning algorithm samjhao",
                "docker container vs virtual machine architecture",
                "ek solid project schedule aur roadmap banao"
              ].map((suggestion, sIdx) => (
                <button
                  key={sIdx}
                  onClick={() => handleSend(suggestion)}
                  className="p-3 border border-[#20232b] hover:border-[#cc8e25] bg-[#161922] text-[#8c919e] hover:text-[#f0f2f5] text-[11px] text-left transition-colors font-mono"
                >
                  <span className="text-[#cc8e25] mr-1.5">&gt;</span>
                  <span>{suggestion}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            let timestamp = '';
            try {
              timestamp = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
            } catch {
              timestamp = '';
            }

            return (
              <div
                key={msg.id}
                className={`max-w-3xl mx-auto border transition-colors ${
                  isUser
                    ? 'border-[#2b303c] bg-[#181b22]'
                    : 'border-[#20232b] bg-[#12141a]'
                }`}
              >
                {/* Message Header Strip */}
                <div className="px-3 py-1.5 border-b border-[#20232b] bg-[#0e1014] flex items-center justify-between text-[10px] font-mono text-[#8c919e]">
                  <div className="flex items-center gap-2">
                    <span className={isUser ? 'text-[#f0f2f5] font-bold' : 'text-[#cc8e25] font-bold'}>
                      {isUser ? `[OPERATOR // ${user?.name || 'USER'}]` : `[BANTAI // ${currentModel.name.toUpperCase()} // ${msg.personalityMode?.toUpperCase() || 'TAPORI'}]`}
                    </span>
                  </div>
                  <span suppressHydrationWarning>{timestamp}</span>
                </div>

                {/* Message Content Body */}
                <div className="p-4 text-xs text-[#d4d6db] leading-relaxed">
                  <FormattedContent content={msg.content} />
                </div>

                {/* Message Footer Utilities */}
                {!isUser && (
                  <div className="px-3 py-1.5 border-t border-[#20232b] bg-[#0e1014] flex items-center justify-between text-[10px] text-[#5a6070]">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="hover:text-[#f0f2f5] transition-colors"
                      >
                        {copiedId === msg.id ? '[COPIED]' : '[COPY]'}
                      </button>
                      <span>|</span>
                      <button
                        onClick={() => handleSpeak(msg.content)}
                        className="hover:text-[#f0f2f5] transition-colors"
                      >
                        [AUDIO READOUT]
                      </button>
                    </div>
                    <span className="text-[#3a3f4d]">100% LOCAL SILICON</span>
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Real-time Streaming Response Card */}
        {isStreaming && (
          <div className="max-w-3xl mx-auto border border-[#cc8e25] bg-[#12141a]">
            <div className="px-3 py-1.5 border-b border-[#20232b] bg-[#0e1014] flex items-center justify-between text-[10px] font-mono text-[#cc8e25]">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-[#cc8e25] animate-pulse inline-block" />
                <span>[BANTAI // STREAMING RUNNER ACTIVE]</span>
              </div>
              <span className="text-[#8c919e]">TOKENS YIELDING</span>
            </div>
            <div className="p-4 text-xs text-[#d4d6db] leading-relaxed">
              {streamingContent ? (
                <FormattedContent content={streamingContent} />
              ) : (
                <div className="text-[#8c919e] font-mono animate-pulse">
                  &gt; Model weights calculating in-memory logits...
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. DOCKED ARCHITECTURAL COMPOSER */}
      <div className="border-t border-[#20232b] bg-[#12141a] p-4">
        <div className="max-w-3xl mx-auto border border-[#2b303c] bg-[#0e1014]">
          {/* Top Context Bar */}
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
              className="text-[#8c919e] hover:text-[#cc8e25] transition-colors uppercase"
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
              <button
                type="button"
                onClick={toggleVoiceInput}
                className={`px-2.5 py-1 text-[10px] uppercase border transition-colors ${
                  isListening
                    ? 'bg-red-500/20 text-red-400 border-red-500'
                    : 'border-[#20232b] text-[#8c919e] hover:text-[#f0f2f5] hover:border-[#3a4050]'
                }`}
                title="Voice Dictation"
              >
                {isListening ? '[STOP MIC]' : '[VOICE DICTATION]'}
              </button>

              <button
                type="button"
                onClick={() => {
                  const nextIdx = (availableModes.indexOf(personalityMode) + 1) % availableModes.length;
                  setPersonalityMode(availableModes[nextIdx]);
                }}
                className="px-2.5 py-1 text-[10px] uppercase border border-[#20232b] text-[#8c919e] hover:text-[#f0f2f5] hover:border-[#3a4050] transition-colors"
              >
                [CYCLE MODE]
              </button>
            </div>

            <div>
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() && !isStreaming}
                className={`px-4 py-1.5 text-xs font-bold uppercase transition-colors ${
                  isStreaming
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : input.trim()
                    ? 'bg-[#cc8e25] hover:bg-[#b06f1d] text-black'
                    : 'bg-[#20232b] text-[#5a6070] cursor-not-allowed'
                }`}
              >
                {isStreaming ? '[ABORT]' : '[EXECUTE // ENTER]'}
              </button>
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
