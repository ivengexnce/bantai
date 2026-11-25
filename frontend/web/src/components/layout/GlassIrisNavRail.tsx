'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp, AppView } from '../../context/AppContext';
import { api } from '../../lib/api';
import {
  MessageSquare,
  Bot,
  Brain,
  Cpu,
  Settings,
  Terminal,
  LogOut,
  User,
  LucideIcon
} from 'lucide-react';

interface NavItem {
  id: AppView;
  label: string;
  icon: LucideIcon;
  isAction?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'chat', label: 'Chat Runtime', icon: MessageSquare },
  { id: 'agent', label: 'Multi-Agent Runner', icon: Bot },
  { id: 'memory', label: 'Memory Store', icon: Brain },
  { id: 'finetune', label: 'Fine-Tune LoRA', icon: Cpu },
  { id: 'settings', label: 'System Settings', icon: Settings }
];

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

  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleLogoClick = async () => {
    try {
      const newConv = await api.createConversation('New Session', personalityMode, selectedModel);
      setConversations(prev => [newConv, ...prev]);
      setActiveConversationId(newConv.id);
      setActiveView('chat');
    } catch {
      setActiveView('chat');
    }
  };

  return (
    <nav
      aria-label="Sidebar Navigation"
      className="w-16 h-screen bg-[#07070f] border-r border-white/5 flex flex-col items-center justify-between py-4 select-none z-40 shrink-0"
    >
      {/* Top: Wordmark Emblem */}
      <div className="flex flex-col items-center gap-6">
        <button
          onClick={handleLogoClick}
          aria-label="BANTAI Home"
          className="relative group p-2 rounded-xl transition-all"
        >
          <div className="w-9 h-9 rounded-xl bg-[#0f0f1a] border border-[#6366f1]/30 flex items-center justify-center text-[#6366f1] group-hover:border-[#6366f1] group-hover:shadow-[0_0_16px_rgba(99,102,241,0.45)] transition-all">
            <Terminal size={18} />
          </div>
        </button>

        {/* 5 Navigation Buttons */}
        <div className="flex flex-col items-center gap-2">
          {NAV_ITEMS.map(item => {
            const isActive = activeView === item.id;
            const Icon = item.icon;

            return (
              <div
                key={item.id}
                className="relative"
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <button
                  onClick={() => setActiveView(item.id)}
                  aria-label={item.label}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all relative ${
                    isActive
                      ? 'bg-[#16162a] text-[#6366f1] border border-[#6366f1]/40 shadow-[0_0_16px_-2px_rgba(99,102,241,0.4)]'
                      : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  {/* Active Indicator Left Glow Strip */}
                  {isActive && (
                    <motion.span
                      layoutId="navRailActiveStrip"
                      className="absolute -left-3 top-2 bottom-2 w-1 bg-[#6366f1] rounded-r-full shadow-[0_0_10px_#6366f1]"
                    />
                  )}
                  <Icon size={18} />
                </button>

                {/* Framer Motion Tooltip */}
                <AnimatePresence>
                  {hoveredItem === item.id && (
                    <motion.div
                      role="tooltip"
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -4 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                      className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-md bg-[#16162a] text-white text-xs font-medium border border-white/10 pointer-events-none whitespace-nowrap shadow-xl z-50"
                    >
                      {item.label}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom: User Profile Menu */}
      <div className="relative">
        <button
          onClick={() => setShowProfileMenu(prev => !prev)}
          aria-label="User Profile"
          className="w-9 h-9 rounded-xl bg-[#0f0f1a] border border-white/10 flex items-center justify-center text-xs font-mono font-semibold text-[#94a3b8] hover:text-white hover:border-[#6366f1]/50 transition-all"
        >
          <User size={18} />
        </button>

        <AnimatePresence>
          {showProfileMenu && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute left-full ml-3 bottom-0 w-52 p-2 rounded-xl surface-floating z-50 text-xs font-sans space-y-1"
            >
              <div className="px-3 py-2 border-b border-white/5">
                <div className="font-semibold text-white truncate">{user?.name || 'Local Developer'}</div>
                <div className="text-[10px] font-mono text-[#64748b] truncate">{user?.email || 'sovereign@localhost'}</div>
              </div>
              <button
                onClick={() => {
                  setActiveView('settings');
                  setShowProfileMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[#94a3b8] hover:text-white hover:bg-white/5 transition-colors"
              >
                <Settings size={18} />
                <span>Preferences</span>
              </button>
              <button
                onClick={() => {
                  logout();
                  setShowProfileMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut size={18} />
                <span>Reset Session</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
