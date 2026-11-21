'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../lib/api';
import {
  PersonalityMode,
  FirestoreMessage,
  SUPPORTED_MODELS,
  PERSONALITY_PROMPTS
} from '@bantai/shared';
import {
  Send,
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
  Smile
} from 'lucide-react';

export function ChatView() {
  const {
    activeConversationId,
    setActiveConversationId,
    setConversations,
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
  const [switchToast, setSwitchToast] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    const model = SUPPORTED_MODELS.find(m => m.id === modelId);
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
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'hi-IN'; // Supports Hindi/Hinglish
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

        {/* Model Selector Dropdown - BANTAI Model Family */}
        <div className="flex items-center gap-2">
          <select
            value={selectedModel}
            onChange={e => handleModelChange(e.target.value)}
            className="bg-black/60 border border-bantai-darkBorder hover:border-bantai-500/60 rounded-xl px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:border-bantai-500 shadow-sm transition"
          >
            {SUPPORTED_MODELS.map(m => (
              <option key={m.id} value={m.id} className="bg-bantai-darkCard text-white py-1">
                {m.icon} {m.shortName} {m.isDefault ? '(Default)' : ''}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Switch Notification Message Banner */}
      {switchToast && (
        <div className="px-6 py-2 bg-gradient-to-r from-bantai-500/20 via-black to-bantai-500/20 border-b border-bantai-500/30 text-xs font-medium text-bantai-300 flex items-center justify-center gap-2 animate-fadeIn">
          <Sparkles className="w-3.5 h-3.5 text-bantai-400" />
          <span>{switchToast}</span>
        </div>
      )}

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 && !streamingContent ? (
          <div className="max-w-2xl mx-auto my-12 text-center space-y-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-bantai-500/20 border border-bantai-500/40 text-bantai-400 shadow-inner">
              <Sparkles className="w-8 h-8" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/60 border border-white/10 text-xs font-semibold mb-3 shadow-sm">
                <span className="text-base">{SUPPORTED_MODELS.find(m => m.id === selectedModel)?.icon || '🤝'}</span>
                <span className="text-white">{SUPPORTED_MODELS.find(m => m.id === selectedModel)?.name || 'BANTAI Bhai'}</span>
                <span className="text-gray-500">·</span>
                <span className="text-bantai-400 font-normal italic">&quot;{SUPPORTED_MODELS.find(m => m.id === selectedModel)?.tagline || 'Har kaam ke liye, har waqt ready.'}&quot;</span>
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
                'Apun ko bata QuickSort algorithm kya hai Mumbai style me?',
                'Draft a clean TypeScript function for retrying failed async tasks',
                'Schedule a reminder for tomorrow 10:00 AM: Vercel production review',
                'What are the 5 core systems that power BANTAI self-hosted AI?'
              ].map((starter, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(starter)}
                  className="p-3 bg-white/5 hover:bg-white/10 border border-bantai-darkBorder rounded-xl text-xs text-gray-300 hover:text-white transition"
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
                  <div className="whitespace-pre-wrap leading-relaxed break-words font-sans">
                    {msg.content}
                  </div>

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
              <div className="whitespace-pre-wrap leading-relaxed break-words font-sans">
                {streamingContent}
                <span className="inline-block w-1.5 h-4 ml-1 bg-bantai-400 animate-pulse align-middle" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-4 border-t border-bantai-darkBorder bg-bantai-darkCard/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto relative flex items-center gap-2">
          <button
            type="button"
            onClick={toggleVoiceInput}
            className={`p-2.5 rounded-xl border transition ${
              isListening
                ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse'
                : 'bg-white/5 border-bantai-darkBorder text-gray-400 hover:text-white'
            }`}
            title="Speech-to-text"
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={`Message BANTAI (${personalityMode} mode)...`}
            rows={1}
            className="flex-1 bg-black/40 border border-bantai-darkBorder rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-bantai-500 resize-none max-h-32"
          />

          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isStreaming}
            className="p-3 bg-bantai-500 hover:bg-bantai-600 disabled:opacity-40 text-black font-bold rounded-xl transition shadow-md shadow-bantai-500/20"
          >
            {isStreaming ? <Square className="w-4 h-4 fill-current" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-[11px] text-gray-500 text-center mt-2">
          BANTAI runs 100% on self-hosted open-weight foundation models. No data is sent to external AI providers.
        </p>
      </div>
    </div>
  );
}
