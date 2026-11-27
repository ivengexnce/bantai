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
  AIModelDescriptor,
  AgentExecutionPlan
} from '@bantai/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const MUTATION_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${escaped}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

class ApiClient {
  private buildHeaders(method: string = 'GET', customHeaders: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders
    };
    if (MUTATION_METHODS.has(method.toUpperCase())) {
      const csrf = readCookie('bantai_csrf');
      if (csrf) {
        headers['X-CSRF-Token'] = csrf;
      }
    }
    return headers;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const method = (options.method || 'GET').toUpperCase();
    const headers = this.buildHeaders(method, (options.headers as Record<string, string>) || {});

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      method,
      headers,
      credentials: 'include'
    });

    if (res.status === 401 && !endpoint.startsWith('/auth/login') && !endpoint.startsWith('/auth/signup')) {
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

  // System Health
  async getHealth(): Promise<{
    status: string;
    aiEngine: { provider: string; isAlive: boolean; availableModels: string[]; error?: string };
  }> {
    const res = await fetch(`${API_BASE}/health`, { credentials: 'include' });
    return await res.json();
  }

  // Auth & MFA (session stored strictly in HttpOnly cookie, never localStorage)
  async signup(payload: { email: string; password: string; name: string; username: string }) {
    return await this.request<{ user: SafeUserProfile }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async login(payload: { email: string; password: string }) {
    return await this.request<{
      user?: SafeUserProfile;
      mfaRequired?: boolean;
      mfaChallengeToken?: string;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async verifyMfaChallenge(challengeToken: string, code: string) {
    return await this.request<{ user: SafeUserProfile }>('/auth/mfa/verify', {
      method: 'POST',
      body: JSON.stringify({ challengeToken, code })
    });
  }

  async setupMfa() {
    return await this.request<{ secret: string; otpauthUri: string }>('/auth/mfa/setup', {
      method: 'POST',
      body: JSON.stringify({})
    });
  }

  async confirmMfa(code: string) {
    return await this.request<{ user: SafeUserProfile; recoveryCodes: string[] }>('/auth/mfa/confirm', {
      method: 'POST',
      body: JSON.stringify({ code })
    });
  }

  async disableMfa(currentPassword: string, code: string) {
    return await this.request<{ user: SafeUserProfile }>('/auth/mfa/disable', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, code })
    });
  }

  async forgotPassword(email: string): Promise<void> {
    await this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword })
    });
  }

  async googleAuth(idToken: string) {
    return await this.request<{ user: SafeUserProfile }>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken })
    });
  }

  async getSession(): Promise<{
    authenticated: boolean;
    user: SafeUserProfile | null;
    localWorkstationAvailable?: boolean;
  }> {
    return await this.request<{
      authenticated: boolean;
      user: SafeUserProfile | null;
      localWorkstationAvailable?: boolean;
    }>('/auth/session');
  }

  async startWorkstationSession(): Promise<{ user: SafeUserProfile }> {
    return await this.request<{ user: SafeUserProfile }>('/auth/workstation-session', {
      method: 'POST',
      body: JSON.stringify({})
    });
  }

  async getMe(): Promise<SafeUserProfile> {
    return await this.request<SafeUserProfile>('/auth/me');
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword })
    });
  }

  async logout(allSessions: boolean = false) {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: this.buildHeaders('POST'),
        credentials: 'include',
        body: JSON.stringify({ allSessions })
      });
    } catch {
      // Ignore network errors while clearing client session
    }
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

  async createConversation(
    title?: string,
    personalityMode: PersonalityMode = 'balanced',
    modelId: string = 'bhai'
  ): Promise<FirestoreConversation> {
    return await this.request<FirestoreConversation>('/chat/conversations', {
      method: 'POST',
      body: JSON.stringify({ title, personalityMode, modelId })
    });
  }

  async getMessages(conversationId: string): Promise<FirestoreMessage[]> {
    return await this.request<FirestoreMessage[]>(`/chat/conversations/${conversationId}/messages`);
  }

  async deleteConversation(conversationId: string): Promise<boolean> {
    await fetch(`${API_BASE}/chat/conversations/${conversationId}`, {
      method: 'DELETE',
      headers: this.buildHeaders('DELETE'),
      credentials: 'include'
    }).then(async r => {
      const body = await r.json();
      if (!r.ok || !body.success) throw new Error(body.error || `HTTP error ${r.status}`);
    });
    return true;
  }

  async sendFeedback(messageId: string, rating: 'up' | 'down', correctionText?: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/chat/feedback`, {
      method: 'POST',
      headers: this.buildHeaders('POST'),
      credentials: 'include',
      body: JSON.stringify({ messageId, rating, correctionText })
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || `HTTP error ${res.status}`);
    return true;
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
    const res = await fetch(`${API_BASE}/chat/stream`, {
      method: 'POST',
      headers: this.buildHeaders('POST'),
      credentials: 'include',
      body: JSON.stringify({ conversationId, content, personalityMode, modelId })
    });

    if (res.status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new Event('bantai:unauthorized'));
    }

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
    await fetch(`${API_BASE}/assistant/tasks/${id}`, {
      method: 'DELETE',
      headers: this.buildHeaders('DELETE'),
      credentials: 'include'
    });
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
    await fetch(`${API_BASE}/assistant/reminders/${id}`, {
      method: 'DELETE',
      headers: this.buildHeaders('DELETE'),
      credentials: 'include'
    });
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
    const res = await fetch(`${API_BASE}/assistant/memory/${id}`, {
      method: 'DELETE',
      headers: this.buildHeaders('DELETE'),
      credentials: 'include'
    });
    const body = await res.json();
    if (!res.ok || !body.success) throw new Error(body.error || `HTTP error ${res.status}`);
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

  async uploadKnowledgeDoc(
    filename: string,
    rawText: string,
    mimeType: 'text/plain' | 'text/markdown' | 'text/csv' | 'application/json' = 'text/plain'
  ): Promise<FirestoreKnowledgeDoc> {
    return await this.request<FirestoreKnowledgeDoc>('/assistant/knowledge/upload', {
      method: 'POST',
      body: JSON.stringify({ filename, rawText, mimeType })
    });
  }

  async uploadKnowledgePdf(filename: string, rawPdfBase64: string): Promise<FirestoreKnowledgeDoc> {
    return await this.request<FirestoreKnowledgeDoc>('/assistant/knowledge/upload', {
      method: 'POST',
      body: JSON.stringify({ filename, rawPdfBase64, mimeType: 'application/pdf' })
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
  async listAgentPlans(): Promise<AgentExecutionPlan[]> {
    return await this.request<AgentExecutionPlan[]>('/assistant/agent/plans');
  }

  async createAgentPlan(goal: string, conversationId?: string): Promise<AgentExecutionPlan> {
    return await this.request<AgentExecutionPlan>('/assistant/agent/plan', {
      method: 'POST',
      body: JSON.stringify({ goal, conversationId })
    });
  }

  async executeAgentPlan(planId: string): Promise<AgentExecutionPlan> {
    return await this.request<AgentExecutionPlan>(`/assistant/agent/execute/${planId}`, {
      method: 'POST',
      body: JSON.stringify({})
    });
  }

  async approveAgentStep(planId: string, stepIndex: number, approved: boolean): Promise<AgentExecutionPlan> {
    return await this.request<AgentExecutionPlan>('/assistant/agent/approve-step', {
      method: 'POST',
      body: JSON.stringify({ planId, stepIndex, approved })
    });
  }

  // Models & System
  async getLearningStatus(): Promise<{
    crossUserTrainingOptIn: boolean;
    personalMemoryEnabled: boolean;
    consentTimestamp: string | null;
    policyVersion: string;
    inferenceBackend: { provider: string; isAlive: boolean; availableModels: string[] };
  }> {
    return await this.request('/learning/status');
  }

  async getModels(): Promise<{
    supportedModels: AIModelDescriptor[];
    backend: { provider: string; isAlive: boolean; availableModels: string[] };
  }> {
    return await this.request('/learning/models');
  }

  async exportDataset(): Promise<{ recordCount: number; message: string }> {
    return await this.request('/learning/export-dataset', {
      method: 'POST',
      body: JSON.stringify({})
    });
  }

  async wipeUserData(): Promise<boolean> {
    await fetch(`${API_BASE}/learning/wipe-data`, {
      method: 'POST',
      headers: this.buildHeaders('POST'),
      credentials: 'include',
      body: JSON.stringify({})
    }).then(async r => {
      const d = await r.json();
      if (!r.ok || !d.success) throw new Error(d.error || 'Wipe failed');
    });
    return true;
  }

  // ElevenLabs Voice Integration
  async getElevenLabsVoices(apiKey?: string): Promise<{ voices: any[]; source: string }> {
    const headers: Record<string, string> = {};
    if (apiKey) headers['x-elevenlabs-key'] = apiKey;
    return await this.request<{ voices: any[]; source: string }>('/voice/elevenlabs/voices', { headers });
  }

  async synthesizeElevenLabs(
    text: string,
    voiceId?: string,
    modelId?: string,
    apiKey?: string
  ): Promise<string> {
    const headers = this.buildHeaders('POST', apiKey ? { 'x-elevenlabs-key': apiKey } : {});
    const res = await fetch(`${API_BASE}/voice/elevenlabs/tts`, {
      method: 'POST',
      headers,
      credentials: 'include',
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
