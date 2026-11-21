import {
  FirestoreConversation,
  FirestoreMessage,
  FirestoreTask,
  FirestoreReminder,
  FirestoreMemory,
  FirestoreCalendarEvent,
  FirestoreEmailDraft,
  FirestoreKnowledgeDoc
} from '@bantai/shared';
import fs from 'fs';
import path from 'path';

/**
 * Firebase Firestore Service — Conversations, Messages, Tasks, Reminders,
 * Memories, Calendar Events, Email Drafts, and Knowledge Documents.
 * 
 * Strict User-Level Data Isolation: Every query requires the authenticated userId.
 */
export class FirebaseFirestoreService {
  private storageDir: string;
  private conversations: Map<string, FirestoreConversation> = new Map();
  private messages: Map<string, FirestoreMessage[]> = new Map(); // conversationId -> messages
  private tasks: Map<string, FirestoreTask> = new Map();
  private reminders: Map<string, FirestoreReminder> = new Map();
  private memories: Map<string, FirestoreMemory> = new Map();
  private calendarEvents: Map<string, FirestoreCalendarEvent> = new Map();
  private emailDrafts: Map<string, FirestoreEmailDraft> = new Map();
  private knowledgeDocs: Map<string, FirestoreKnowledgeDoc> = new Map();

  constructor(baseDir: string = './data') {
    this.storageDir = path.join(baseDir, 'firestore_store');
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      const files = [
        { name: 'conversations.json', target: this.conversations, isArray: false },
        { name: 'tasks.json', target: this.tasks, isArray: false },
        { name: 'reminders.json', target: this.reminders, isArray: false },
        { name: 'memories.json', target: this.memories, isArray: false },
        { name: 'calendar.json', target: this.calendarEvents, isArray: false },
        { name: 'emails.json', target: this.emailDrafts, isArray: false },
        { name: 'knowledge.json', target: this.knowledgeDocs, isArray: false }
      ];

      for (const item of files) {
        const filePath = path.join(this.storageDir, item.name);
        if (fs.existsSync(filePath)) {
          const list = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          for (const rec of list) {
            item.target.set(rec.id, rec);
          }
        }
      }

      const msgPath = path.join(this.storageDir, 'messages.json');
      if (fs.existsSync(msgPath)) {
        const allMsgs: FirestoreMessage[] = JSON.parse(fs.readFileSync(msgPath, 'utf8'));
        for (const msg of allMsgs) {
          const list = this.messages.get(msg.conversationId) || [];
          list.push(msg);
          this.messages.set(msg.conversationId, list);
        }
      }
    } catch (err) {
      console.warn('[FirebaseService] Initialized fresh Firestore store', err);
    }
  }

  private persist() {
    try {
      fs.writeFileSync(path.join(this.storageDir, 'conversations.json'), JSON.stringify(Array.from(this.conversations.values()), null, 2));
      
      const allMsgs: FirestoreMessage[] = [];
      for (const arr of this.messages.values()) {
        allMsgs.push(...arr);
      }
      fs.writeFileSync(path.join(this.storageDir, 'messages.json'), JSON.stringify(allMsgs, null, 2));

      fs.writeFileSync(path.join(this.storageDir, 'tasks.json'), JSON.stringify(Array.from(this.tasks.values()), null, 2));
      fs.writeFileSync(path.join(this.storageDir, 'reminders.json'), JSON.stringify(Array.from(this.reminders.values()), null, 2));
      fs.writeFileSync(path.join(this.storageDir, 'memories.json'), JSON.stringify(Array.from(this.memories.values()), null, 2));
      fs.writeFileSync(path.join(this.storageDir, 'calendar.json'), JSON.stringify(Array.from(this.calendarEvents.values()), null, 2));
      fs.writeFileSync(path.join(this.storageDir, 'emails.json'), JSON.stringify(Array.from(this.emailDrafts.values()), null, 2));
      fs.writeFileSync(path.join(this.storageDir, 'knowledge.json'), JSON.stringify(Array.from(this.knowledgeDocs.values()), null, 2));
    } catch (err) {
      console.error('[FirebaseService] Persist error:', err);
    }
  }

  // --- CONVERSATIONS ---
  async createConversation(conv: FirestoreConversation): Promise<FirestoreConversation> {
    this.conversations.set(conv.id, conv);
    this.messages.set(conv.id, []);
    this.persist();
    return conv;
  }

  async getConversations(userId: string): Promise<FirestoreConversation[]> {
    return Array.from(this.conversations.values())
      .filter(c => c.userId === userId && !c.isArchived)
      .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  }

  async getConversationById(userId: string, conversationId: string): Promise<FirestoreConversation | null> {
    const conv = this.conversations.get(conversationId);
    if (!conv || conv.userId !== userId) return null;
    return conv;
  }

  async updateConversation(userId: string, conversationId: string, updates: Partial<FirestoreConversation>): Promise<FirestoreConversation> {
    const conv = await this.getConversationById(userId, conversationId);
    if (!conv) throw new Error('Conversation not found or unauthorized');

    const updated = { ...conv, ...updates, updatedAt: new Date().toISOString() };
    this.conversations.set(conversationId, updated);
    this.persist();
    return updated;
  }

  async deleteConversation(userId: string, conversationId: string): Promise<boolean> {
    const conv = await this.getConversationById(userId, conversationId);
    if (!conv) return false;

    this.conversations.delete(conversationId);
    this.messages.delete(conversationId);
    this.persist();
    return true;
  }

  // --- MESSAGES ---
  async addMessage(msg: FirestoreMessage): Promise<FirestoreMessage> {
    const conv = await this.getConversationById(msg.userId, msg.conversationId);
    if (!conv) throw new Error('Conversation not found or unauthorized');

    const list = this.messages.get(msg.conversationId) || [];
    list.push(msg);
    this.messages.set(msg.conversationId, list);

    conv.messageCount = list.length;
    conv.lastMessageAt = msg.createdAt;
    conv.updatedAt = msg.createdAt;
    this.conversations.set(conv.id, conv);

    this.persist();
    return msg;
  }

  async getMessages(userId: string, conversationId: string): Promise<FirestoreMessage[]> {
    const conv = await this.getConversationById(userId, conversationId);
    if (!conv) throw new Error('Conversation not found or unauthorized');

    return (this.messages.get(conversationId) || []).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  async recordFeedback(userId: string, messageId: string, feedback: FirestoreMessage['feedback']): Promise<boolean> {
    for (const [convId, msgList] of this.messages.entries()) {
      const msg = msgList.find(m => m.id === messageId && m.userId === userId);
      if (msg) {
        msg.feedback = feedback;
        this.persist();
        return true;
      }
    }
    return false;
  }

  // --- TASKS ---
  async createTask(task: FirestoreTask): Promise<FirestoreTask> {
    this.tasks.set(task.id, task);
    this.persist();
    return task;
  }

  async getTasks(userId: string): Promise<FirestoreTask[]> {
    return Array.from(this.tasks.values())
      .filter(t => t.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async updateTask(userId: string, taskId: string, updates: Partial<FirestoreTask>): Promise<FirestoreTask> {
    const task = this.tasks.get(taskId);
    if (!task || task.userId !== userId) throw new Error('Task not found or unauthorized');

    const updated = { ...task, ...updates, updatedAt: new Date().toISOString() };
    if (updates.status === 'completed' && task.status !== 'completed') {
      updated.completedAt = new Date().toISOString();
    }
    this.tasks.set(taskId, updated);
    this.persist();
    return updated;
  }

  async deleteTask(userId: string, taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task || task.userId !== userId) return false;

    this.tasks.delete(taskId);
    this.persist();
    return true;
  }

  // --- REMINDERS ---
  async createReminder(reminder: FirestoreReminder): Promise<FirestoreReminder> {
    this.reminders.set(reminder.id, reminder);
    this.persist();
    return reminder;
  }

  async getReminders(userId: string): Promise<FirestoreReminder[]> {
    return Array.from(this.reminders.values())
      .filter(r => r.userId === userId)
      .sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());
  }

  async updateReminder(userId: string, reminderId: string, updates: Partial<FirestoreReminder>): Promise<FirestoreReminder> {
    const rem = this.reminders.get(reminderId);
    if (!rem || rem.userId !== userId) throw new Error('Reminder not found or unauthorized');

    const updated = { ...rem, ...updates };
    this.reminders.set(reminderId, updated);
    this.persist();
    return updated;
  }

  async deleteReminder(userId: string, reminderId: string): Promise<boolean> {
    const rem = this.reminders.get(reminderId);
    if (!rem || rem.userId !== userId) return false;

    this.reminders.delete(reminderId);
    this.persist();
    return true;
  }

  // --- MEMORIES ---
  async createMemory(mem: FirestoreMemory): Promise<FirestoreMemory> {
    this.memories.set(mem.id, mem);
    this.persist();
    return mem;
  }

  async getMemories(userId: string): Promise<FirestoreMemory[]> {
    return Array.from(this.memories.values())
      .filter(m => m.userId === userId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  async updateMemory(userId: string, memoryId: string, updates: Partial<FirestoreMemory>): Promise<FirestoreMemory> {
    const mem = this.memories.get(memoryId);
    if (!mem || mem.userId !== userId) throw new Error('Memory not found or unauthorized');

    const updated = { ...mem, ...updates, updatedAt: new Date().toISOString() };
    this.memories.set(memoryId, updated);
    this.persist();
    return updated;
  }

  async deleteMemory(userId: string, memoryId: string): Promise<boolean> {
    const mem = this.memories.get(memoryId);
    if (!mem || mem.userId !== userId) return false;

    this.memories.delete(memoryId);
    this.persist();
    return true;
  }

  async clearAllMemories(userId: string): Promise<number> {
    let count = 0;
    for (const [id, m] of this.memories.entries()) {
      if (m.userId === userId) {
        this.memories.delete(id);
        count++;
      }
    }
    this.persist();
    return count;
  }

  // --- CALENDAR EVENTS ---
  async getCalendarEvents(userId: string): Promise<FirestoreCalendarEvent[]> {
    return Array.from(this.calendarEvents.values()).filter(e => e.userId === userId);
  }

  async createCalendarEvent(event: FirestoreCalendarEvent): Promise<FirestoreCalendarEvent> {
    this.calendarEvents.set(event.id, event);
    this.persist();
    return event;
  }

  // --- EMAIL DRAFTS ---
  async getEmailDrafts(userId: string): Promise<FirestoreEmailDraft[]> {
    return Array.from(this.emailDrafts.values()).filter(d => d.userId === userId);
  }

  async createEmailDraft(draft: FirestoreEmailDraft): Promise<FirestoreEmailDraft> {
    this.emailDrafts.set(draft.id, draft);
    this.persist();
    return draft;
  }

  async updateEmailDraft(userId: string, draftId: string, updates: Partial<FirestoreEmailDraft>): Promise<FirestoreEmailDraft> {
    const draft = this.emailDrafts.get(draftId);
    if (!draft || draft.userId !== userId) throw new Error('Draft not found or unauthorized');

    const updated = { ...draft, ...updates, updatedAt: new Date().toISOString() };
    this.emailDrafts.set(draftId, updated);
    this.persist();
    return updated;
  }

  // --- KNOWLEDGE DOCUMENTS ---
  async getKnowledgeDocs(userId: string): Promise<FirestoreKnowledgeDoc[]> {
    return Array.from(this.knowledgeDocs.values()).filter(d => d.userId === userId);
  }

  async addKnowledgeDoc(doc: FirestoreKnowledgeDoc): Promise<FirestoreKnowledgeDoc> {
    this.knowledgeDocs.set(doc.id, doc);
    this.persist();
    return doc;
  }

  // Wipe all user data (for account deletion or GDPR compliance)
  async wipeAllUserData(userId: string): Promise<void> {
    // Delete conversations & messages
    for (const conv of Array.from(this.conversations.values())) {
      if (conv.userId === userId) {
        this.conversations.delete(conv.id);
        this.messages.delete(conv.id);
      }
    }
    // Delete tasks
    for (const [id, t] of this.tasks.entries()) {
      if (t.userId === userId) this.tasks.delete(id);
    }
    // Delete reminders
    for (const [id, r] of this.reminders.entries()) {
      if (r.userId === userId) this.reminders.delete(id);
    }
    // Delete memories
    for (const [id, m] of this.memories.entries()) {
      if (m.userId === userId) this.memories.delete(id);
    }
    // Delete calendar
    for (const [id, c] of this.calendarEvents.entries()) {
      if (c.userId === userId) this.calendarEvents.delete(id);
    }
    // Delete emails
    for (const [id, e] of this.emailDrafts.entries()) {
      if (e.userId === userId) this.emailDrafts.delete(id);
    }
    // Delete knowledge
    for (const [id, k] of this.knowledgeDocs.entries()) {
      if (k.userId === userId) this.knowledgeDocs.delete(id);
    }
    this.persist();
  }
}

export const firebaseFirestoreService = new FirebaseFirestoreService();
