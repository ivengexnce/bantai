'use client';

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { GlassIrisNavRail } from '../components/layout/GlassIrisNavRail';
import { GlassIrisTopBar } from '../components/layout/GlassIrisTopBar';
import { ChatView } from '../components/chat/ChatView';
import { AgenticView } from '../components/assistant/AgenticView';
import { DashboardView } from '../components/assistant/DashboardView';
import { TasksView } from '../components/assistant/TasksView';
import { RemindersView } from '../components/assistant/RemindersView';
import { CalendarView } from '../components/assistant/CalendarView';
import { KnowledgeView } from '../components/assistant/KnowledgeView';
import { MemoryView } from '../components/assistant/MemoryView';
import { SettingsView } from '../components/assistant/SettingsView';
import { LandingPage } from '../components/landing/LandingPage';
import { AuthModal } from '../components/auth/AuthModal';
import { Dialog } from '../components/ui/Dialog';

export default function HomePage() {
  const { user, isLoadingUser, activeView } = useApp();
  const [showAuth, setShowAuth] = useState(false);

  // Clean atmospheric loading state while session initializes
  if (isLoadingUser && !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0E0E0E] text-white">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-2 border-[#2F6BFF] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-medium text-[#8C8C8C] tracking-widest uppercase">
            Initializing Glass Iris AI Runtime...
          </p>
        </div>
      </div>
    );
  }

  // If user explicitly chooses to view the technical landing page
  if (activeView === 'landing') {
    return (
      <>
        <LandingPage onOpenAuth={() => setShowAuth(true)} />
        <Dialog
          isOpen={showAuth}
          onClose={() => setShowAuth(false)}
          title="SECURITY AUTHENTICATION GATEWAY"
        >
          <AuthModal />
        </Dialog>
      </>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#0A0B0E] text-white selection:bg-[#2F6BFF] selection:text-white font-sans relative">
      {/* Cinematic Atmospheric Noise Overlay */}
      <div className="fixed inset-0 bg-noise pointer-events-none z-50 opacity-40" />

      {/* Atmospheric Volumetric Overhead Light Cone */}
      <div className="fixed inset-0 volumetric-light-cone pointer-events-none z-0" />

      {/* 3.A Left Navigation Rail (Compact 56px reference width) */}
      <GlassIrisNavRail />

      {/* Main App Column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        {/* 3.B Top Navigation Bar */}
        <GlassIrisTopBar />

        {/* 3.C Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          {activeView === 'chat' && <ChatView />}
          {activeView === 'agent' && <AgenticView />}
          {activeView === 'dashboard' && <DashboardView />}
          {activeView === 'tasks' && <TasksView />}
          {activeView === 'reminders' && <RemindersView />}
          {activeView === 'calendar' && <CalendarView />}
          {activeView === 'knowledge' && <KnowledgeView />}
          {activeView === 'memory' && <MemoryView />}
          {activeView === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Auth Modal (if user wants to log in or create another account) */}
      <Dialog
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        title="SECURITY AUTHENTICATION GATEWAY"
      >
        <AuthModal />
      </Dialog>
    </div>
  );
}
