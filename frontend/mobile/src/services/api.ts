import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Configurable public API URL for production builds; defaults to emulator loopback in dev.
export const API_BASE =
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:4000/api' : 'http://localhost:4000/api');

export interface MobileUserProfile {
  userId: string;
  email: string;
  name: string;
  username: string;
  role: string;
  mfaEnabled?: boolean;
  preferences?: {
    defaultPersonalityMode?: string;
    personalityMode?: string;
    preferredModel?: string;
    ttsEnabled?: boolean;
  };
}

export interface MobileChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
}

export interface MobileConversation {
  id: string;
  title: string;
  personalityMode: string;
  modelId: string;
  updatedAt: string;
}

export interface MobileTask {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority?: string;
  createdAt?: string;
}

export interface MobileMemory {
  id: string;
  key: string;
  category: string;
  content: string;
  createdAt?: string;
}

export class MobileApi {
  static async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('bantai_token');
    } catch {
      return null;
    }
  }

  static async setToken(token: string | null): Promise<void> {
    try {
      if (token) await AsyncStorage.setItem('bantai_token', token);
      else await AsyncStorage.removeItem('bantai_token');
    } catch (err) {
      console.error('AsyncStorage error:', err);
    }
  }

  static async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {})
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || `HTTP error ${res.status}`);
    }
    return data.data as T;
  }

  static async login(email: string, password: string): Promise<{
    user?: MobileUserProfile;
    token?: string;
    mfaRequired?: boolean;
    mfaChallengeToken?: string;
  }> {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (data.token) {
      await this.setToken(data.token);
    }
    return data;
  }

  static async verifyMfaChallenge(challengeToken: string, code: string): Promise<{
    user: MobileUserProfile;
    token: string;
  }> {
    const data = await this.request('/auth/mfa/verify', {
      method: 'POST',
      body: JSON.stringify({ challengeToken, code })
    });
    if (data.token) {
      await this.setToken(data.token);
    }
    return data;
  }

  static async signup(email: string, password: string, name: string, username: string): Promise<{
    user: MobileUserProfile;
    token: string;
  }> {
    const data = await this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, username })
    });
    if (data.token) {
      await this.setToken(data.token);
    }
    return data;
  }

  static async getMe(): Promise<MobileUserProfile> {
    return this.request<MobileUserProfile>('/auth/me');
  }

  static async logout(allSessions: boolean = false): Promise<void> {
    try {
      await this.request('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ allSessions })
      });
    } catch {
      // Ignore network errors while clearing local session
    } finally {
      await this.setToken(null);
    }
  }

  static async getConversations(): Promise<MobileConversation[]> {
    return this.request<MobileConversation[]>('/chat/conversations');
  }

  static async createConversation(
    title: string = 'Mobile Chat',
    personalityMode: string = 'tapori',
    modelId: string = 'chhotu'
  ): Promise<MobileConversation> {
    return this.request<MobileConversation>('/chat/conversations', {
      method: 'POST',
      body: JSON.stringify({ title, personalityMode, modelId })
    });
  }

  static async getMessages(conversationId: string): Promise<MobileChatMessage[]> {
    return this.request<MobileChatMessage[]>(`/chat/conversations/${conversationId}/messages`);
  }

  static async sendChatStream(
    conversationId: string,
    content: string,
    personalityMode: string = 'tapori',
    modelId: string = 'chhotu',
    onToken?: (partialText: string) => void
  ): Promise<string> {
    const token = await this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/chat/stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ conversationId, content, personalityMode, modelId })
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || `Chat failed (${res.status})`);
    }

    let accumulated = '';
    const parseLines = (chunkText: string) => {
      for (const block of chunkText.split('\n\n')) {
        const line = block.trim();
        if (!line.startsWith('data: ')) continue;
        try {
          const parsed = JSON.parse(line.slice(6));
          if (parsed.type === 'token' && typeof parsed.content === 'string') {
            accumulated += parsed.content;
            onToken?.(accumulated);
          } else if (parsed.type === 'error' && parsed.error) {
            throw new Error(parsed.error);
          }
        } catch (err) {
          if (err instanceof Error && err.message && !err.message.includes('JSON')) {
            throw err;
          }
        }
      }
    };

    // React Native Hermes may not implement ReadableStream getReader(); fall back cleanly to res.text()
    if (res.body && typeof (res.body as any).getReader === 'function') {
      const reader = (res.body as any).getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';
        for (const p of parts) {
          parseLines(`${p}\n\n`);
        }
      }
      if (buffer.trim()) parseLines(`${buffer}\n\n`);
    } else {
      const rawText = await res.text();
      parseLines(rawText);
    }

    return accumulated || 'Done, bantai!';
  }

  static async getTasks(): Promise<MobileTask[]> {
    return this.request<MobileTask[]>('/assistant/tasks');
  }

  static async createTask(title: string): Promise<MobileTask> {
    return this.request<MobileTask>('/assistant/tasks', {
      method: 'POST',
      body: JSON.stringify({ title, priority: 'medium' })
    });
  }

  static async updateTaskStatus(
    id: string,
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  ): Promise<MobileTask> {
    return this.request<MobileTask>(`/assistant/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  }

  static async deleteTask(id: string): Promise<void> {
    const token = await this.getToken();
    const res = await fetch(`${API_BASE}/assistant/tasks/${id}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Failed to delete task (${res.status})`);
    }
  }

  static async getMemories(): Promise<MobileMemory[]> {
    return this.request<MobileMemory[]>('/assistant/memory');
  }
}
