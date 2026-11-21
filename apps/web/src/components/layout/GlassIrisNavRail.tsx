'use client';

import React, { useState } from 'react';
import { useApp, AppView } from '../../context/AppContext';
import { api } from '../../lib/api';

export function GlassIrisNavRail() {
  const {
    user,
    activeView,
    setActiveView,
    setConversations,
    setActiveConversationId,
    personalityMode,
    selectedModel,
    logout
  } = useApp();

  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleNewChat = async () => {
    try {
      const newConv = await api.createConversation('New Chat', personalityMode, selectedModel);
      setConversations(prev => [newConv, ...prev]);
      setActiveConversationId(newConv.id);
      setActiveView('chat');
    } catch (err) {
      console.error('Failed to create new conversation:', err);
    }
  };

  const navItems: Array<{
    id: AppView;
    label: string;
    icon: React.ReactNode;
    action?: () => void;
  }> = [
    {
      id: 'chat',
      label: 'New Chat',
      action: handleNewChat,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      )
    },
    {
      id: 'chat',
      label: 'Chat History',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      id: 'agent',
      label: 'Explore / AI Features',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      )
    },
    {
      id: 'memory',
      label: 'Saved & Memory',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
      )
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    }
  ];

  return (
    <nav className="w-14 sm:w-16 bg-[#111111] border-r border-white/5 flex flex-col items-center py-4 justify-between select-none z-40 shrink-0">
      {/* Top: BANTAI Glass Iris Emblem */}
      <div className="flex flex-col items-center gap-6">
        <button
          onClick={() => setActiveView('chat')}
          className="relative group p-2 rounded-xl transition-all duration-200"
          title="BANTAI Iris Home"
        >
          {/* Glowing Iris Orb Icon */}
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#2453DB] via-[#2F6BFF] to-[#7C48F0] p-[1.5px] shadow-lg shadow-[#2F6BFF]/25">
            <div className="w-full h-full rounded-full bg-[#0E0E0E] flex items-center justify-center relative overflow-hidden">
              <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-[#2F6BFF] to-[#5A4CF5] animate-pulse" />
              <div className="absolute top-1 left-2 w-1.5 h-1 rounded-full bg-white/70 blur-[0.5px]" />
            </div>
          </div>
        </button>

        {/* Navigation Items */}
        <div className="flex flex-col items-center gap-2">
          {navItems.map((item, index) => {
            const isActive = activeView === item.id;
            return (
              <div key={index} className="relative group">
                <button
                  onClick={() => {
                    if (item.action) {
                      item.action();
                    } else {
                      setActiveView(item.id);
                    }
                  }}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 relative ${
                    isActive
                      ? 'bg-[#1D1D1D] text-[#2F6BFF] shadow-sm'
                      : 'text-[#8C8C8C] hover:text-[#FFFFFF] hover:bg-[#181818]'
                  }`}
                  title={item.label}
                >
                  {/* Active Indicator Left Pill */}
                  {isActive && (
                    <span className="absolute -left-2 sm:-left-3 top-2 bottom-2 w-1 bg-[#2F6BFF] rounded-r-full shadow-[0_0_8px_#2F6BFF]" />
                  )}
                  {item.icon}
                </button>

                {/* Tooltip on Hover */}
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-md bg-[#1D1D1D] text-[#FFFFFF] text-[11px] font-medium border border-white/10 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 whitespace-nowrap shadow-xl z-50">
                  {item.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom: User Profile Avatar */}
      <div className="relative">
        <button
          onClick={() => setShowProfileMenu(prev => !prev)}
          className="w-9 h-9 rounded-full bg-[#1D1D1D] border border-white/10 flex items-center justify-center text-xs font-semibold text-white hover:border-[#2F6BFF]/60 transition-colors relative"
          title={user?.name || 'User Profile'}
        >
          <span>{(user?.name || 'Meet').charAt(0).toUpperCase()}</span>
          {/* Online status indicator */}
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#2F6BFF] border-2 border-[#111111]" />
        </button>

        {/* Profile Popover Menu */}
        {showProfileMenu && (
          <div className="absolute left-full ml-3 bottom-0 w-52 rounded-xl bg-[#1D1D1D] border border-white/10 p-2 shadow-2xl z-50 text-xs">
            <div className="px-3 py-2 border-b border-white/5 mb-1">
              <div className="font-semibold text-white truncate">{user?.name || 'Meet Maru'}</div>
              <div className="text-[11px] text-[#8C8C8C] truncate">{user?.email || 'meet@bantai.ai'}</div>
            </div>
            <button
              onClick={() => {
                setActiveView('settings');
                setShowProfileMenu(false);
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-[#8C8C8C] hover:text-white hover:bg-[#252525] transition-colors"
            >
              Settings &amp; Preferences
            </button>
            <button
              onClick={() => {
                logout();
                setShowProfileMenu(false);
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
