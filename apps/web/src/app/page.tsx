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

export default function HomePage() {
  const { user, isLoadingUser, activeView } = useApp();

  // Show clean spinner while verifying stored session token
  if (isLoadingUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bantai-dark">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-bantai-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-bantai-400 uppercase tracking-widest">
            Loading BANTAI Engine...
          </p>
        </div>
      </div>
    );
  }

  const [showAuth, setShowAuth] = useState(false);

  // If user is not authenticated, show the Sovereign Landing Page
  if (!user) {
    return (
      <>
        <LandingPage onOpenAuth={() => setShowAuth(true)} />
        {showAuth && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="relative w-full max-w-md">
              <button
                onClick={() => setShowAuth(false)}
                className="absolute -top-10 right-0 text-[#8c919e] hover:text-white font-mono text-xs uppercase"
              >
                [ CLOSE X ]
              </button>
              <AuthModal />
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-bantai-dark">
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
