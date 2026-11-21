'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { SafeUserProfile, FirestoreConversation, PersonalityMode } from '@bantai/shared';
import { api } from '../lib/api';

export type AppView = 'chat' | 'dashboard' | 'tasks' | 'reminders' | 'calendar' | 'knowledge' | 'memory' | 'settings';

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
  logout: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SafeUserProfile | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [activeView, setActiveView] = useState<AppView>('chat');
  const [conversations, setConversations] = useState<FirestoreConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [personalityMode, setPersonalityMode] = useState<PersonalityMode>('tapori');
  const [selectedModel, setSelectedModel] = useState<string>('bhai');

  const refreshConversations = async () => {
    try {
      const list = await api.getConversations();
      if (list.length === 0) {
        const initial = await api.createConversation('New Chat', personalityMode, selectedModel);
        setConversations([initial]);
        setActiveConversationId(initial.id);
      } else {
        setConversations(list);
        if (!activeConversationId) {
          setActiveConversationId(list[0].id);
        }
      }
    } catch (err) {
      console.warn('Failed to load conversations:', err);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = api.getToken();
      if (!token) {
        setIsLoadingUser(false);
        return;
      }
      setIsLoadingUser(true);
      try {
        const profile = await api.getMe();
        setUser(profile);
        if (profile.preferences?.defaultPersonalityMode) {
          setPersonalityMode(profile.preferences.defaultPersonalityMode);
        }
      } catch (err) {
        console.warn('Session expired or invalid:', err);
        api.logout();
        setUser(null);
      } finally {
        setIsLoadingUser(false);
      }
    };
    initAuth();
  }, []);

  useEffect(() => {
    if (user) {
      refreshConversations();
    }
  }, [user]);

  const logout = () => {
    api.logout();
    setUser(null);
    setConversations([]);
    setActiveConversationId(null);
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
        logout
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
