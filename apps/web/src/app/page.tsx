'use client';

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { LandingPage } from '../components/landing/LandingPage';
import { AuthModal } from '../components/auth/AuthModal';
import { Sidebar } from '../components/layout/Sidebar';
import { ChatView } from '../components/chat/ChatView';
import { AgenticView } from '../components/assistant/AgenticView';
import { DashboardView } from '../components/assistant/DashboardView';
import { TasksView } from '../components/assistant/TasksView';
import { RemindersView } from '../components/assistant/RemindersView';
import { CalendarView } from '../components/assistant/CalendarView';
import { KnowledgeView } from '../components/assistant/KnowledgeView';
import { MemoryView } from '../components/assistant/MemoryView';
import { SettingsView } from '../components/assistant/SettingsView';
import { Dialog } from '../components/ui/Dialog';

export default function HomePage() {
  const { user, isLoadingUser, activeView } = useApp();
  const [showAuth, setShowAuth] = useState(false);

  // Show clean spinner while verifying stored session token
  if (isLoadingUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0e1014]">
        <div className="text-center space-y-3 font-mono">
          <div className="w-8 h-8 border-2 border-[#cc8e25] border-t-transparent animate-spin mx-auto" />
          <p className="text-xs font-bold text-[#cc8e25] uppercase tracking-widest">
            [VERIFYING ENCRYPTED SESSION...]
          </p>
        </div>
      </div>
    );
  }

  // If user is not authenticated or explicitly viewing landing page
  if (!user || activeView === 'landing') {
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
    <div className="flex h-screen overflow-hidden bg-[#0e1014]">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
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
  );
}
