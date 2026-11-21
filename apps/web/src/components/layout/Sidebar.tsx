'use client';

import React, { useState } from 'react';
import { useApp, AppView } from '../../context/AppContext';
import { api } from '../../lib/api';
import { resolveModel } from '../../lib/models';

export function Sidebar() {
  const {
    user,
    activeView,
    setActiveView,
    conversations,
    setConversations,
    activeConversationId,
    setActiveConversationId,
    personalityMode,
    selectedModel,
    logout
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');

  const handleNewChat = async () => {
    try {
      const newConv = await api.createConversation('New Session', personalityMode, selectedModel);
      setConversations(prev => [newConv, ...prev]);
      setActiveConversationId(newConv.id);
      setActiveView('chat');
    } catch (err) {
      console.error('Failed to create new conversation:', err);
    }
  };

  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Permanently purge this conversation record?')) return;
    try {
      await api.deleteConversation(id);
      setConversations(prev => prev.filter(c => c.id !== id));
      if (activeConversationId === id) {
        const remaining = conversations.filter(c => c.id !== id);
        setActiveConversationId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (err) {
      console.error('Failed to delete chat:', err);
    }
  };

  const filteredConversations = conversations.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const navItems: Array<{ id: AppView; tag: string; label: string; badge?: string }> = [
    { id: 'landing', tag: '[00]', label: 'LANDING PAGE' },
    { id: 'chat', tag: '[01]', label: 'CHAT CONSOLE' },
    { id: 'agent', tag: '[02]', label: 'AGENT PLANNER', badge: '10 TOOLS' },
    { id: 'dashboard', tag: '[03]', label: 'SPECIFICATIONS' },
    { id: 'tasks', tag: '[04]', label: 'TASK REGISTRY' },
    { id: 'reminders', tag: '[05]', label: 'SCHEDULED REMINDERS' },
    { id: 'calendar', tag: '[06]', label: 'CALENDAR RUNNER' },
    { id: 'knowledge', tag: '[07]', label: 'KNOWLEDGE BASE' },
    { id: 'memory', tag: '[08]', label: 'PRIVATE MEMORY' },
    { id: 'settings', tag: '[09]', label: 'SYSTEM CONFIG' }
  ];

  const currentModel = resolveModel(selectedModel);

  return (
    <aside className="w-72 bg-[#0b0d12] border-r border-[#20232b] flex flex-col h-screen select-none font-mono text-xs">
      {/* 1. Header / Brand Spec */}
      <div className="p-4 border-b border-[#20232b] flex items-center justify-between bg-[#0e1015]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-[#cc8e25] text-black font-bold flex items-center justify-center text-xs">
            B
          </div>
          <div>
            <h2 className="text-xs font-bold text-[#f0f2f5] tracking-widest uppercase">BANTAI</h2>
            <p className="text-[10px] text-[#8c919e] tracking-tight">
              APNA MODEL. APNA DIMAAG.
            </p>
          </div>
        </div>

        <div className="px-2 py-0.5 border border-[#20232b] bg-[#12141a] text-[10px] text-[#cc8e25]">
          {currentModel.parameters}
        </div>
      </div>

      {/* 2. New Chat Action */}
      <div className="p-3 border-b border-[#20232b]">
        <button
          onClick={handleNewChat}
          className="w-full py-2.5 px-3 bg-[#cc8e25] hover:bg-[#b06f1d] text-black font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
        >
          <span>[+]</span>
          <span>INITIALIZE SESSION</span>
        </button>
      </div>

      {/* 3. Navigation Index */}
      <div className="py-2 border-b border-[#20232b]">
        <div className="px-3 pb-1.5 text-[9px] uppercase tracking-widest text-[#5a6070]">
          NAVIGATION SPEC
        </div>
        <div className="space-y-0.5">
          {navItems.map(item => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center justify-between px-3 py-1.5 text-[11px] uppercase transition-colors text-left ${
                  isActive
                    ? 'bg-[#181b22] text-[#cc8e25] font-bold border-l-2 border-[#cc8e25]'
                    : 'text-[#8c919e] hover:text-[#f0f2f5] hover:bg-[#12141a]'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className={isActive ? 'text-[#cc8e25]' : 'text-[#484e5d]'}>
                    {item.tag}
                  </span>
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[9px] font-mono px-1 py-0.2 bg-[#20232b] text-[#10b981] border border-[#2b303c]">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Telemetry Filter & Local History */}
      <div className="flex-1 flex flex-col min-h-0 pt-3">
        <div className="px-3 mb-2">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="[FILTER SESSIONS...]"
            className="w-full bg-[#12141a] border border-[#20232b] px-2.5 py-1.5 text-[11px] text-[#f0f2f5] placeholder-[#5a6070] focus:outline-none focus:border-[#cc8e25]"
          />
        </div>

        <div className="px-3 pb-1 text-[9px] uppercase tracking-widest text-[#5a6070] flex items-center justify-between">
          <span>LOCAL SESSION LOG</span>
          <span>{filteredConversations.length}</span>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-6 text-[10px] text-[#5a6070]">
              [ZERO MATCHING SESSIONS]
            </div>
          ) : (
            filteredConversations.map(conv => {
              const isActive = activeConversationId === conv.id && activeView === 'chat';
              return (
                <div
                  key={conv.id}
                  onClick={() => {
                    setActiveConversationId(conv.id);
                    setActiveView('chat');
                  }}
                  className={`group relative flex items-center justify-between px-2.5 py-1.5 text-[11px] cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-[#181b22] text-[#f0f2f5] border border-[#2b303c]'
                      : 'text-[#8c919e] hover:text-[#f0f2f5] hover:bg-[#12141a]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate pr-2">
                    <span className={isActive ? 'text-[#cc8e25]' : 'text-[#3a3f4d]'}>&gt;</span>
                    <span className="truncate">{conv.title}</span>
                  </div>

                  <button
                    onClick={e => handleDeleteConversation(e, conv.id)}
                    className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity p-0.5 font-bold"
                    title="Purge Record"
                  >
                    [X]
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 5. Operator Identity & System Exit */}
      <div className="p-3 border-t border-[#20232b] bg-[#0e1015] flex items-center justify-between">
        <div className="truncate pr-2">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-[#10b981] inline-block" />
            <p className="text-[11px] font-bold text-[#f0f2f5] truncate uppercase">
              {user?.name || 'OPERATOR'}
            </p>
          </div>
          <p className="text-[9px] text-[#5a6070] truncate mt-0.5">
            {user?.email || 'OFFLINE'}
          </p>
        </div>

        <button
          onClick={logout}
          className="px-2 py-1 border border-[#20232b] hover:border-red-500/50 hover:text-red-400 text-[#8c919e] text-[10px] uppercase transition-colors"
          title="Terminate Session"
        >
          [EXIT]
        </button>
      </div>
    </aside>
  );
}
