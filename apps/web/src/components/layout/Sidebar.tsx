'use client';

import React, { useState } from 'react';
import { useApp, AppView } from '../../context/AppContext';
import { api } from '../../lib/api';
import { SUPPORTED_MODELS, resolveModel } from '@bantai/shared';
import {
  MessageSquare,
  Plus,
  LayoutDashboard,
  CheckSquare,
  Bell,
  BookOpen,
  Brain,
  Settings,
  Trash2,
  LogOut,
  Search,
  Bot,
  Cpu,
  Calendar as CalendarIcon,
  Sparkles
} from 'lucide-react';

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
      const newConv = await api.createConversation('New Conversation', personalityMode, selectedModel);
      setConversations(prev => [newConv, ...prev]);
      setActiveConversationId(newConv.id);
      setActiveView('chat');
    } catch (err) {
      console.error('Failed to create new conversation:', err);
    }
  };

  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this conversation?')) return;
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

  const navItems: Array<{ id: AppView; label: string; icon: React.ReactNode; badge?: string }> = [
    { id: 'chat', label: 'Conversational AI', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'agent', label: 'Agentic Engine', icon: <Cpu className="w-4 h-4" />, badge: '10 Tools' },
    { id: 'dashboard', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'tasks', label: 'Tasks', icon: <CheckSquare className="w-4 h-4" /> },
    { id: 'reminders', label: 'Reminders', icon: <Bell className="w-4 h-4" /> },
    { id: 'calendar', label: 'Calendar', icon: <CalendarIcon className="w-4 h-4" /> },
    { id: 'knowledge', label: 'Knowledge Base', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'memory', label: 'Personal Memory', icon: <Brain className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings & Privacy', icon: <Settings className="w-4 h-4" /> }
  ];

  const currentModel = resolveModel(selectedModel);

  return (
    <aside className="w-72 bg-bantai-darkCard border-r border-bantai-darkBorder flex flex-col h-screen select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-bantai-darkBorder flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-bantai-500/20 border border-bantai-500/40 text-bantai-400 flex items-center justify-center font-bold text-lg shadow-inner">
            B
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-wide">BANTAI</h2>
            <p className="text-[10px] text-bantai-400 font-semibold tracking-wider uppercase">
              Apna Model. Apna Dimaag.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/40 border border-white/10 text-[11px] font-semibold text-gray-300">
          <span>{currentModel.icon}</span>
          <span className="text-white">{currentModel.shortName}</span>
        </div>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <button
          onClick={handleNewChat}
          className="w-full py-2.5 px-3 bg-bantai-500 hover:bg-bantai-600 text-black font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition shadow-md shadow-bantai-500/20"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" /> New Chat
        </button>
      </div>

      {/* Main Navigation Links */}
      <div className="px-3 py-1 space-y-0.5 border-b border-bantai-darkBorder">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-medium transition ${
              activeView === item.id
                ? 'bg-white/10 text-white font-semibold'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className={activeView === item.id ? 'text-bantai-400' : 'text-gray-400'}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </div>
            {item.badge && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-bantai-500/20 text-bantai-400 border border-bantai-500/30">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Conversation Search & History */}
      <div className="flex-1 flex flex-col min-h-0 pt-3">
        <div className="px-3 mb-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search chats..."
              className="w-full bg-black/30 border border-bantai-darkBorder rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-bantai-500"
            />
          </div>
        </div>

        <div className="px-3 pb-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
          Recent Conversations
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-6 text-xs text-gray-500">
              No conversations found
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
                  className={`group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition ${
                    isActive
                      ? 'bg-bantai-500/15 text-white font-medium border border-bantai-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-bantai-400' : 'text-gray-500'}`} />
                    <span className="truncate">{conv.title}</span>
                  </div>

                  <button
                    onClick={e => handleDeleteConversation(e, conv.id)}
                    className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition p-1"
                    title="Delete Chat"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* User Footer Profile */}
      <div className="p-3 border-t border-bantai-darkBorder flex items-center justify-between">
        <div className="flex items-center gap-2.5 truncate">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-xs font-bold text-black flex-shrink-0">
            {user?.name.charAt(0).toUpperCase()}
          </div>
          <div className="truncate">
            <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
            <p className="text-[10px] text-gray-400 truncate">{user?.email}</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="p-1.5 text-gray-400 hover:text-red-400 transition rounded-lg hover:bg-white/5"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
