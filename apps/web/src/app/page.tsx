'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { GlassIrisNavRail } from '../components/layout/GlassIrisNavRail';
import { GlassIrisTopBar } from '../components/layout/GlassIrisTopBar';
import { ChatView } from '../components/chat/ChatView';
import { AgenticView } from '../components/assistant/AgenticView';
import { MemoryView } from '../components/assistant/MemoryView';
import { FineTuneView } from '../components/assistant/FineTuneView';
import { SettingsView } from '../components/assistant/SettingsView';

export default function HomePage() {
  const { user, isLoadingUser, activeView } = useApp();

  // Clean atmospheric loading state while session initializes
  if (isLoadingUser && !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#07070f] text-white font-mono">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-[#6366f1] border-t-transparent rounded-full animate-spin mx-auto shadow-[0_0_12px_#6366f1]" />
          <p className="text-xs text-[#94a3b8] tracking-widest uppercase">
            Initializing BANTAI Silicon Runtime...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#07070f] text-white selection:bg-[#6366f1] selection:text-white font-sans relative min-w-[1280px]">
      {/* 64px Fixed Left Navigation Rail */}
      <GlassIrisNavRail />

      {/* Main App Column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10 bg-[#07070f]">
        {/* 48px Top Navigation Bar */}
        <GlassIrisTopBar />

        {/* Main Content Area (Framer Motion View Transitions: fade + y: 8 to 0) */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="flex-1 flex flex-col h-full overflow-hidden"
            >
              {activeView === 'chat' && <ChatView />}
              {activeView === 'agent' && <AgenticView />}
              {activeView === 'memory' && <MemoryView />}
              {activeView === 'finetune' && <FineTuneView />}
              {activeView === 'settings' && <SettingsView />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
