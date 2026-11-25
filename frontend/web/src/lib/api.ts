import {
  SafeUserProfile,
  FirestoreConversation,
  FirestoreMessage,
  FirestoreTask,
  FirestoreReminder,
  FirestoreMemory,
  FirestoreKnowledgeDoc,
  PersonalityMode,
  ChatStreamChunk,
  AIModelDescriptor
} from '@bantai/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

class ApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('bantai_token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) localStorage.setItem('bantai_token', token);
      else localStorage.removeItem('bantai_token');
    }
  }

  getToken(): string | null {
    if (!this.token && typeof window !== 'undefined') {
      this.token = localStorage.getItem('bantai_token');
    }
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    if (res.status === 401) {
      this.setToken(null);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('bantai:unauthorized'));
      }
    }

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || `HTTP error ${res.status}`);
    }

    return data.data;
  }

  // Auth
  async signup(payload: { email: string; password: string; name: string; username: string }) {
    const data = await this.request<{ user: SafeUserProfile; token: string }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    this.setToken(data.token);
    return data;
  }

  async login(payload: { email: string; password: string }) {
    const data = await this.request<{ user: SafeUserProfile; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    this.setToken(data.token);
    return data;
  }

  async googleAuth(idToken: string) {
    const data = await this.request<{ user: SafeUserProfile; token: string }>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken })
    });
    this.setToken(data.token);
    return data;
  }

  async getMe(): Promise<SafeUserProfile> {
    return await this.request<SafeUserProfile>('/auth/me');
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<{ token: string }> {
    const data = await this.request<{ token: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword })
    });
    if (data?.token) this.setToken(data.token);
    return data;
  }

  async logout(allSessions: boolean = false) {
    const token = this.getToken();
    if (token) {
      try {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ allSessions })
        });
      } catch {
        // Proceed clearing client session even if server is offline
      }
    }
    this.setToken(null);
  }

  async updatePreferences(prefs: Partial<SafeUserProfile['preferences']>): Promise<SafeUserProfile> {
    return await this.request<SafeUserProfile>('/auth/preferences', {
      method: 'PATCH',
      body: JSON.stringify(prefs)
    });
  }

  async updateConsent(consent: Partial<SafeUserProfile['learningConsent']>): Promise<SafeUserProfile> {
    return await this.request<SafeUserProfile>('/auth/consent', {
      method: 'PATCH',
      body: JSON.stringify(consent)
    });
  }

  // Conversations & Messages
  async getConversations(): Promise<FirestoreConversation[]> {
    return await this.request<FirestoreConversation[]>('/chat/conversations');
  }

  async createConversation(title?: string, personalityMode: PersonalityMode = 'tapori', modelId: string = 'qwen2.5:7b'): Promise<FirestoreConversation> {
    return await this.request<FirestoreConversation>('/chat/conversations', {
      method: 'POST',
      body: JSON.stringify({ title, personalityMode, modelId })
    });
  }

  async getMessages(conversationId: string): Promise<FirestoreMessage[]> {
    return await this.request<FirestoreMessage[]>(`/chat/conversations/${conversationId}/messages`);
  }

  async deleteConversation(conversationId: string): Promise<boolean> {
    await this.request(`/chat/conversations/${conversationId}`, { method: 'DELETE' });
    return true;
  }

  async sendFeedback(messageId: string, rating: 'up' | 'down', correctionText?: string): Promise<boolean> {
    return await this.request<boolean>('/chat/feedback', {
      method: 'POST',
      body: JSON.stringify({ messageId, rating, correctionText })
    });
  }

  /**
   * Stream chat with Server-Sent Events
   */
  async streamMessage(
    conversationId: string,
    content: string,
    personalityMode: PersonalityMode,
    modelId: string,
    onChunk: (chunk: ChatStreamChunk) => void
  ): Promise<void> {
    const token = this.getToken();
    const res = await fetch(`${API_BASE}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ conversationId, content, personalityMode, modelId })
    });

    if (!res.ok || !res.body) {
      throw new Error(`Failed to stream chat: HTTP ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const chunk: ChatStreamChunk = JSON.parse(line.substring(6));
            onChunk(chunk);
          } catch {
            // ignore malformed
          }
        }
      }
    }
  }

  // Tasks
  async getTasks(): Promise<FirestoreTask[]> {
    return await this.request<FirestoreTask[]>('/assistant/tasks');
  }

  async createTask(task: Partial<FirestoreTask>): Promise<FirestoreTask> {
    return await this.request<FirestoreTask>('/assistant/tasks', {
      method: 'POST',
      body: JSON.stringify(task)
    });
  }

  async updateTask(id: string, updates: Partial<FirestoreTask>): Promise<FirestoreTask> {
    return await this.request<FirestoreTask>(`/assistant/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  }

  async deleteTask(id: string): Promise<boolean> {
    await this.request(`/assistant/tasks/${id}`, { method: 'DELETE' });
    return true;
  }

  // Reminders
  async getReminders(): Promise<FirestoreReminder[]> {
    return await this.request<FirestoreReminder[]>('/assistant/reminders');
  }

  async createReminder(reminder: { title: string; scheduledTime: string; timezone?: string }): Promise<FirestoreReminder> {
    return await this.request<FirestoreReminder>('/assistant/reminders', {
      method: 'POST',
      body: JSON.stringify(reminder)
    });
  }

  async deleteReminder(id: string): Promise<boolean> {
    await this.request(`/assistant/reminders/${id}`, { method: 'DELETE' });
    return true;
  }

  // Personal Memory
  async getMemories(): Promise<FirestoreMemory[]> {
    return await this.request<FirestoreMemory[]>('/assistant/memory');
  }

  async createMemory(mem: { key: string; category: string; content: string }): Promise<FirestoreMemory> {
    return await this.request<FirestoreMemory>('/assistant/memory', {
      method: 'POST',
      body: JSON.stringify(mem)
    });
  }

  async deleteMemory(id: string): Promise<boolean> {
    await this.request(`/assistant/memory/${id}`, { method: 'DELETE' });
    return true;
  }

  async clearAllMemories(): Promise<boolean> {
    await this.request('/assistant/memory-clear-all', { method: 'DELETE' });
    return true;
  }

  // Knowledge Base
  async getKnowledgeDocs(): Promise<FirestoreKnowledgeDoc[]> {
    return await this.request<FirestoreKnowledgeDoc[]>('/assistant/knowledge/docs');
  }

  async uploadKnowledgeDoc(filename: string, rawText: string): Promise<FirestoreKnowledgeDoc> {
    return await this.request<FirestoreKnowledgeDoc>('/assistant/knowledge/upload', {
      method: 'POST',
      body: JSON.stringify({ filename, rawText })
    });
  }

  async queryKnowledge(query: string, topK: number = 3): Promise<any[]> {
    return await this.request<any[]>('/assistant/knowledge/query', {
      method: 'POST',
      body: JSON.stringify({ query, topK })
    });
  }

  // Calendar
  async getCalendarEvents(): Promise<any[]> {
    return await this.request<any[]>('/assistant/calendar');
  }

  async createCalendarEvent(event: { title: string; startTime: string; endTime: string; description?: string; location?: string }): Promise<any> {
    return await this.request<any>('/assistant/calendar', {
      method: 'POST',
      body: JSON.stringify(event)
    });
  }

  // Agentic Engine
  async createAgentPlan(goal: string, conversationId?: string): Promise<any> {
    return await this.request<any>('/assistant/agent/plan', {
      method: 'POST',
      body: JSON.stringify({ goal, conversationId })
    });
  }

  async executeAgentPlan(planId: string): Promise<any> {
    return await this.request<any>(`/assistant/agent/execute/${planId}`, {
      method: 'POST'
    });
  }

  async approveAgentStep(planId: string, stepIndex: number, approved: boolean): Promise<any> {
    return await this.request<any>('/assistant/agent/approve-step', {
      method: 'POST',
      body: JSON.stringify({ planId, stepIndex, approved })
    });
  }

  // Models & System
  async getModels(): Promise<{ supportedModels: AIModelDescriptor[]; backend: unknown }> {
    return await this.request<{ supportedModels: AIModelDescriptor[]; backend: unknown }>('/learning/models');
  }

  async wipeUserData(): Promise<boolean> {
    await this.request('/learning/wipe-data', { method: 'POST' });
    this.logout();
    return true;
  }

  // ElevenLabs Voice Integration
  async getElevenLabsVoices(apiKey?: string): Promise<{ voices: any[]; source: string }> {
    const headers: Record<string, string> = {};
    if (apiKey) headers['x-elevenlabs-key'] = apiKey;
    return await this.request<{ voices: any[]; source: string }>(
      '/voice/elevenlabs/voices',
      { headers }
    );
  }

  async synthesizeElevenLabs(
    text: string,
    voiceId?: string,
    modelId?: string,
    apiKey?: string
  ): Promise<string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (apiKey) headers['x-elevenlabs-key'] = apiKey;

    const res = await fetch(`${API_BASE}/voice/elevenlabs/tts`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ text, voiceId, modelId })
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `Failed to synthesize audio with ElevenLabs (${res.status})`);
    }

    const blob = await res.blob();
    return URL.createObjectURL(blob);
  }
}

export const api = new ApiClient();
