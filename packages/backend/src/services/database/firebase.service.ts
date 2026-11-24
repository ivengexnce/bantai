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
// firebase-admin v14+ requires importing sub-packages explicitly
import { initializeApp, getApps, App, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore, Firestore, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { config } from '../../config/env';

/**
 * Firebase Firestore Service â€” Conversations, Messages, Tasks, Reminders,
 * Memories, Calendar Events, Email Drafts, and Knowledge Documents.
 * 
 * Strict User-Level Data Isolation: Every query requires the authenticated userId.
 * Dual-Mode Operation: Automatically connects to Live Google Cloud Firestore (bantai-369)
 * when serviceAccountKey.json or credentials are provided; seamlessly falls back to
 * local user-isolated disk store in development.
 */
export class FirebaseFirestoreService {
  private storageDir: string;
  private firestore: Firestore | null = null;
  private isLiveFirestore: boolean = false;

  // Local fallback storage
  private conversations: Map<string, FirestoreConversation> = new Map();
  private messages: Map<string, FirestoreMessage[]> = new Map();
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
    this.initFirebaseAdmin();
    this.loadFromDisk();
  }

  private initFirebaseAdmin() {
    try {
      const rootKeyPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
      const backendKeyPath = path.resolve(__dirname, '../../../serviceAccountKey.json');
      const customKeyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || '';

      let credential: ReturnType<typeof cert> | null = null;

      if (fs.existsSync(rootKeyPath)) {
        credential = cert(rootKeyPath as unknown as ServiceAccount);
      } else if (fs.existsSync(backendKeyPath)) {
        credential = cert(backendKeyPath as unknown as ServiceAccount);
      } else if (customKeyPath && fs.existsSync(customKeyPath)) {
        credential = cert(customKeyPath as unknown as ServiceAccount);
      } else if (config.firebaseClientEmail && config.firebasePrivateKey) {
        credential = cert({
          projectId: config.firebaseProjectId || 'bantai-369',
          clientEmail: config.firebaseClientEmail,
          privateKey: config.firebasePrivateKey
        });
      }

      if (credential) {
        let app: App;
        if (!getApps().length) {
          app = initializeApp({
            credential,
            projectId: config.firebaseProjectId || 'bantai-369',
            storageBucket: config.firebaseStorageBucket
          });
        } else {
          app = getApps()[0];
        }
        this.firestore = getFirestore(app);
        this.isLiveFirestore = true;
        console.log(`[FirebaseService] CONNECTED to Live Cloud Firestore (Project: ${config.firebaseProjectId || 'bantai-369'})`);
      } else {
        console.log('[FirebaseService] Using local user-isolated disk store (Place serviceAccountKey.json for live bantai-369 Firestore)');
      }
    } catch (err) {
      console.warn('[FirebaseService] Live Firestore init notice (falling back to local store):', (err as Error).message);
      this.isLiveFirestore = false;
      this.firestore = null;
    }
  }

  private loadFromDisk() {
    try {
      const files = [
        { name: 'conversations.json', target: this.conversations },
        { name: 'tasks.json', target: this.tasks },
        { name: 'reminders.json', target: this.reminders },
        { name: 'memories.json', target: this.memories },
        { name: 'calendar.json', target: this.calendarEvents },
        { name: 'emails.json', target: this.emailDrafts },
        { name: 'knowledge.json', target: this.knowledgeDocs }
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
      console.warn('[FirebaseService] Initialized fresh local Firestore store');
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
    if (this.isLiveFirestore && this.firestore) {
      try {
        await this.firestore.collection('conversations').doc(conv.id).set(conv);
      } catch (e) {
        console.error('[FirebaseService] Live Firestore error:', e);
      }
    }
    this.conversations.set(conv.id, conv);
    this.messages.set(conv.id, []);
    this.persist();
    return conv;
  }

  async getConversations(userId: string): Promise<FirestoreConversation[]> {
    if (this.isLiveFirestore && this.firestore) {
      try {
        const snap = await this.firestore.collection('conversations')
          .where('userId', '==', userId)
          .where('isArchived', '==', false)
          .get();
        const list = snap.docs.map((d) => d.data() as FirestoreConversation);
        return list.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
      } catch (e) {
        console.error('[FirebaseService] Live Firestore error:', e);
      }
    }
    return Array.from(this.conversations.values())
      .filter(c => c.userId === userId && !c.isArchived)
      .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  }

  async getConversationById(userId: string, conversationId: string): Promise<FirestoreConversation | null> {
    if (this.isLiveFirestore && this.firestore) {
      try {
        const doc = await this.firestore.collection('conversations').doc(conversationId).get();
        if (doc.exists) {
          const data = doc.data() as FirestoreConversation;
          if (data.userId === userId) return data;
        }
      } catch (e) {
        console.error('[FirebaseService] Live Firestore error:', e);
      }
    }
    const conv = this.conversations.get(conversationId);
    if (!conv || conv.userId !== userId) return null;
    return conv;
  }

  async updateConversation(userId: string, conversationId: string, updates: Partial<FirestoreConversation>): Promise<FirestoreConversation> {
    const conv = await this.getConversationById(userId, conversationId);
    if (!conv) throw new Error('Conversation not found or unauthorized');

    const updated = { ...conv, ...updates, updatedAt: new Date().toISOString() };
    if (this.isLiveFirestore && this.firestore) {
      try {
        await this.firestore.collection('conversations').doc(conversationId).update(updated);
      } catch (e) {
        console.error('[FirebaseService] Live Firestore error:', e);
      }
    }
    this.conversations.set(conversationId, updated);
    this.persist();
    return updated;
  }

  async deleteConversation(userId: string, conversationId: string): Promise<boolean> {
    const conv = await this.getConversationById(userId, conversationId);
    if (!conv) return false;

    if (this.isLiveFirestore && this.firestore) {
      try {
        await this.firestore.collection('conversations').doc(conversationId).delete();
      } catch (e) {
        console.error('[FirebaseService] Live Firestore error:', e);
      }
    }
    this.conversations.delete(conversationId);
    this.messages.delete(conversationId);
    this.persist();
    return true;
  }

  // --- MESSAGES ---
  async addMessage(msg: FirestoreMessage): Promise<FirestoreMessage> {
    const conv = await this.getConversationById(msg.userId, msg.conversationId);
    if (!conv) throw new Error('Conversation not found or unauthorized');

    if (this.isLiveFirestore && this.firestore) {
      try {
        await this.firestore.collection('messages').doc(msg.id).set(msg);
        await this.firestore.collection('conversations').doc(conv.id).update({
          messageCount: (conv.messageCount || 0) + 1,
          lastMessageAt: msg.createdAt,
          updatedAt: msg.createdAt
        });
      } catch (e) {
        console.error('[FirebaseService] Live Firestore error:', e);
      }
    }

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

    if (this.isLiveFirestore && this.firestore) {
      try {
        const snap = await this.firestore.collection('messages')
          .where('conversationId', '==', conversationId)
          .where('userId', '==', userId)
          .get();
        const list = snap.docs.map((d) => d.data() as FirestoreMessage);
        return list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      } catch (e) {
        console.error('[FirebaseService] Live Firestore error:', e);
      }
    }

    return (this.messages.get(conversationId) || []).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  async recordFeedback(userId: string, messageId: string, feedback: FirestoreMessage['feedback']): Promise<boolean> {
    if (this.isLiveFirestore && this.firestore) {
      try {
        await this.firestore.collection('messages').doc(messageId).update({ feedback });
      } catch (e) {
        console.error('[FirebaseService] Live Firestore error:', e);
      }
    }
    for (const [, msgList] of this.messages.entries()) {
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
    if (this.isLiveFirestore && this.firestore) {
      try {
        await this.firestore.collection('tasks').doc(task.id).set(task);
      } catch (e) {
        console.error('[FirebaseService] Live Firestore error:', e);
      }
    }
    this.tasks.set(task.id, task);
    this.persist();
    return task;
  }

  async getTasks(userId: string): Promise<FirestoreTask[]> {
    if (this.isLiveFirestore && this.firestore) {
      try {
        const snap = await this.firestore.collection('tasks')
          .where('userId', '==', userId)
          .get();
        const list = snap.docs.map((d) => d.data() as FirestoreTask);
        return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } catch (e) {
        console.error('[FirebaseService] Live Firestore error:', e);
      }
    }
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

    if (this.isLiveFirestore && this.firestore) {
      try {
        await this.firestore.collection('tasks').doc(taskId).update(updated);
      } catch (e) {
        console.error('[FirebaseService] Live Firestore error:', e);
      }
    }

    this.tasks.set(taskId, updated);
    this.persist();
    return updated;
  }

  async deleteTask(userId: string, taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task || task.userId !== userId) return false;

    if (this.isLiveFirestore && this.firestore) {
      try {
        await this.firestore.collection('tasks').doc(taskId).delete();
      } catch (e) {
        console.error('[FirebaseService] Live Firestore error:', e);
      }
    }

    this.tasks.delete(taskId);
    this.persist();
    return true;
  }

  // --- REMINDERS ---
  async createReminder(reminder: FirestoreReminder): Promise<FirestoreReminder> {
    if (this.isLiveFirestore && this.firestore) {
      try {
        await this.firestore.collection('reminders').doc(reminder.id).set(reminder);
      } catch (e) {
        console.error('[FirebaseService] Live Firestore error:', e);
      }
    }
    this.reminders.set(reminder.id, reminder);
    this.persist();
    return reminder;
  }

  async getReminders(userId: string): Promise<FirestoreReminder[]> {
    if (this.isLiveFirestore && this.firestore) {
      try {
        const snap = await this.firestore.collection('reminders')
          .where('userId', '==', userId)
          .get();
        const list = snap.docs.map((d) => d.data() as FirestoreReminder);
        return list.sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());
      } catch (e) {
        console.error('[FirebaseService] Live Firestore error:', e);
      }
    }
    return Array.from(this.reminders.values())
      .filter(r => r.userId === userId)
      .sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());
  }

  async updateReminder(userId: string, reminderId: string, updates: Partial<FirestoreReminder>): Promise<FirestoreReminder> {
    const rem = this.reminders.get(reminderId);
    if (!rem || rem.userId !== userId) throw new Error('Reminder not found or unauthorized');

    const updated = { ...rem, ...updates };
    if (this.isLiveFirestore && this.firestore) {
      try {
        await this.firestore.collection('reminders').doc(reminderId).update(updated);
      } catch (e) {
        console.error('[FirebaseService] Live Firestore error:', e);
      }
    }
    this.reminders.set(reminderId, updated);
    this.persist();
    return updated;
  }

  async deleteReminder(userId: string, reminderId: string): Promise<boolean> {
    const rem = this.reminders.get(reminderId);
    if (!rem || rem.userId !== userId) return false;

    if (this.isLiveFirestore && this.firestore) {
      try {
        await this.firestore.collection('reminders').doc(reminderId).delete();
      } catch (e) {
        console.error('[FirebaseService] Live Firestore error:', e);
      }
    }

    this.reminders.delete(reminderId);
    this.persist();
    return true;
  }

  // --- MEMORIES ---
  async createMemory(mem: FirestoreMemory): Promise<FirestoreMemory> {
    if (this.isLiveFirestore && this.firestore) {
      try {
        await this.firestore.collection('memories').doc(mem.id).set(mem);
      } catch (e) {
        console.error('[FirebaseService] Live Firestore error:', e);
      }
    }
    this.memories.set(mem.id, mem);
    this.persist();
    return mem;
  }

  async getMemories(userId: string): Promise<FirestoreMemory[]> {
    if (this.isLiveFirestore && this.firestore) {
      try {
        const snap = await this.firestore.collection('memories')
          .where('userId', '==', userId)
          .get();
        const list = snap.docs.map((d) => d.data() as FirestoreMemory);
        return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      } catch (e) {
        console.error('[FirebaseService] Live Firestore error:', e);
      }
    }
    return Array.from(this.memories.values())
      .filter(m => m.userId === userId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  async updateMemory(userId: string, memoryId: string, updates: Partial<FirestoreMemory>): Promise<FirestoreMemory> {
    const mem = this.memories.get(memoryId);
    if (!mem || mem.userId !== userId) throw new Error('Memory not found or unauthorized');

    const updated = { ...mem, ...updates, updatedAt: new Date().toISOString() };
    if (this.isLiveFirestore && this.firestore) {
      try {
        await this.firestore.collection('memories').doc(memoryId).update(updated);
      } catch (e) {
        console.error('[FirebaseService] Live Firestore error:', e);
      }
    }
    this.memories.set(memoryId, updated);
    this.persist();
    return updated;
  }

  async deleteMemory(userId: string, memoryId: string): Promise<boolean> {
    const mem = this.memories.get(memoryId);
    if (!mem || mem.userId !== userId) return false;

    if (this.isLiveFirestore && this.firestore) {
      try {
        await this.firestore.collection('memories').doc(memoryId).delete();
      } catch (e) {
        console.error('[FirebaseService] Live Firestore error:', e);
      }
    }

    this.memories.delete(memoryId);
    this.persist();
    return true;
  }

  async clearAllMemories(userId: string): Promise<number> {
    let count = 0;
    if (this.isLiveFirestore && this.firestore) {
      try {
        const snap = await this.firestore.collection('memories').where('userId', '==', userId).get();
        const batch = this.firestore.batch();
        snap.docs.forEach((doc: import("firebase-admin/firestore").QueryDocumentSnapshot) => batch.delete(doc.ref));
        await batch.commit();
      } catch (e) {
        console.error('[FirebaseService] Live Firestore error:', e);
      }
    }
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
    if (this.isLiveFirestore && this.firestore) {
      try {
        const snap = await this.firestore.collection('calendar').where('userId', '==', userId).get();
        return snap.docs.map((d) => d.data() as FirestoreCalendarEvent);
      } catch (e) {
        console.error('[FirebaseService] Live Firestore error:', e);
      }
    }
    return Array.from(this.calendarEvents.values()).filter(e => e.userId === userId);
  }

  async createCalendarEvent(event: FirestoreCalendarEvent): Promise<FirestoreCalendarEvent> {
    if (this.isLiveFirestore && this.firestore) {
      try {
        await this.firestore.collection('calendar').doc(event.id).set(event);
      } catch (e) {
        console.error('[FirebaseService] Live Firestore error:', e);
      }
    }
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
    if (this.isLiveFirestore && this.firestore) {
      try {
        const snap = await this.firestore.collection('knowledge').where('userId', '==', userId).get();
        return snap.docs.map((d) => d.data() as FirestoreKnowledgeDoc);
      } catch (e) {
        console.error('[FirebaseService] Live Firestore error:', e);
      }
    }
    return Array.from(this.knowledgeDocs.values()).filter(d => d.userId === userId);
  }

  async addKnowledgeDoc(doc: FirestoreKnowledgeDoc): Promise<FirestoreKnowledgeDoc> {
    if (this.isLiveFirestore && this.firestore) {
      try {
        await this.firestore.collection('knowledge').doc(doc.id).set(doc);
      } catch (e) {
        console.error('[FirebaseService] Live Firestore error:', e);
      }
    }
    this.knowledgeDocs.set(doc.id, doc);
    this.persist();
    return doc;
  }

  // Wipe all user data (for account deletion or GDPR compliance)
  async wipeAllUserData(userId: string): Promise<void> {
    if (this.isLiveFirestore && this.firestore) {
      try {
        const collections = ['conversations', 'messages', 'tasks', 'reminders', 'memories', 'calendar', 'knowledge'];
        for (const col of collections) {
          const snap = await this.firestore.collection(col).where('userId', '==', userId).get();
          const batch = this.firestore.batch();
          snap.docs.forEach((doc: import("firebase-admin/firestore").QueryDocumentSnapshot) => batch.delete(doc.ref));
          await batch.commit();
        }
      } catch (e) {
        console.error('[FirebaseService] Live Firestore wipe error:', e);
      }
    }

    for (const conv of Array.from(this.conversations.values())) {
      if (conv.userId === userId) {
        this.conversations.delete(conv.id);
        this.messages.delete(conv.id);
      }
    }
    for (const [id, t] of this.tasks.entries()) {
      if (t.userId === userId) this.tasks.delete(id);
    }
    for (const [id, r] of this.reminders.entries()) {
      if (r.userId === userId) this.reminders.delete(id);
    }
    for (const [id, m] of this.memories.entries()) {
      if (m.userId === userId) this.memories.delete(id);
    }
    for (const [id, c] of this.calendarEvents.entries()) {
      if (c.userId === userId) this.calendarEvents.delete(id);
    }
    for (const [id, e] of this.emailDrafts.entries()) {
      if (e.userId === userId) this.emailDrafts.delete(id);
    }
    for (const [id, k] of this.knowledgeDocs.entries()) {
      if (k.userId === userId) this.knowledgeDocs.delete(id);
    }
    this.persist();
  }
}

export const firebaseFirestoreService = new FirebaseFirestoreService();
