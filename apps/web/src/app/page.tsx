'use client';

import React from 'react';
import { useApp } from '../context/AppContext';
import { AuthModal } from '../components/auth/AuthModal';
import { Sidebar } from '../components/layout/Sidebar';
import { ChatView } from '../components/chat/ChatView';
import { DashboardView } from '../components/assistant/DashboardView';
import { TasksView } from '../components/assistant/TasksView';
import { RemindersView } from '../components/assistant/RemindersView';
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

  // STRICT SECURITY RULE: Authentication screen must be displayed before access to protected features
  if (!user) {
    return <AuthModal />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-bantai-dark">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {activeView === 'chat' && <ChatView />}
        {activeView === 'dashboard' && <DashboardView />}
        {activeView === 'tasks' && <TasksView />}
        {activeView === 'reminders' && <RemindersView />}
        {activeView === 'knowledge' && <KnowledgeView />}
        {activeView === 'memory' && <MemoryView />}
        {activeView === 'settings' && <SettingsView />}
      </main>
    </div>
  );
}
