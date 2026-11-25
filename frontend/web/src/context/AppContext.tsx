'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SafeUserProfile, FirestoreConversation, PersonalityMode } from '@bantai/shared';
import { api } from '../lib/api';

export type AppView = 'chat' | 'agent' | 'memory' | 'finetune' | 'settings';

interface AppContextType {
  user: SafeUserProfile | null;
  setUser: (u: SafeUserProfile | null) => void;
  isLoadingUser: boolean;
  activeView: AppView;
  setActiveView: (view: AppView) => void;
  conversations: FirestoreConversation[];
  setConversations: React.Dispatch<React.SetStateAction<FirestoreConversation[]>>;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  personalityMode: PersonalityMode;
  setPersonalityMode: (m: PersonalityMode) => void;
  selectedModel: string;
  setSelectedModel: (m: string) => void;
  refreshConversations: () => Promise<void>;
  logout: (allSessions?: boolean) => Promise<void>;
  wipeAccount: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SafeUserProfile | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [activeView, setActiveView] = useState<AppView>('chat');
  const [conversations, setConversations] = useState<FirestoreConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [personalityMode, setPersonalityMode] = useState<PersonalityMode>('tapori');
  const [selectedModel, setSelectedModel] = useState<string>('bhai');

  const refreshConversations = useCallback(async () => {
    try {
      const list = await api.getConversations();
      if (list.length === 0) {
        const initial = await api.createConversation('New Chat', personalityMode, selectedModel);
        setConversations([initial]);
        setActiveConversationId(initial.id);
      } else {
        setConversations(list);
        setActiveConversationId(prev => (prev && list.some(c => c.id === prev) ? prev : list[0].id));
      }
    } catch (err) {
      console.warn('Failed to load conversations:', err);
    }
  }, [personalityMode, selectedModel]);

  useEffect(() => {
    const initAuth = async () => {
      setIsLoadingUser(true);
      try {
        const session = await api.getSession();
        if (session.authenticated && session.user) {
          setUser(session.user);
          if (session.user.preferences?.defaultPersonalityMode) {
            setPersonalityMode(session.user.preferences.defaultPersonalityMode);
          }
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setIsLoadingUser(false);
      }
    };
    initAuth();

    const handleUnauthorized = () => {
      setUser(null);
      setConversations([]);
      setActiveConversationId(null);
    };
    window.addEventListener('bantai:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('bantai:unauthorized', handleUnauthorized);
  }, []);

  useEffect(() => {
    if (user) {
      refreshConversations();
    }
  }, [user, refreshConversations]);

  const logout = async (allSessions: boolean = false) => {
    await api.logout(allSessions);
    setUser(null);
    setConversations([]);
    setActiveConversationId(null);
    setActiveView('chat');
  };

  const wipeAccount = async () => {
    await api.wipeUserData();
    setUser(null);
    setConversations([]);
    setActiveConversationId(null);
    setActiveView('chat');
  };

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        isLoadingUser,
        activeView,
        setActiveView,
        conversations,
        setConversations,
        activeConversationId,
        setActiveConversationId,
        personalityMode,
        setPersonalityMode,
        selectedModel,
        setSelectedModel,
        refreshConversations,
        logout,
        wipeAccount
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
}
