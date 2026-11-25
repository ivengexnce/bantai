import { FirestoreMemory, MemoryCategory } from '@bantai/shared';
import { firebaseFirestoreService } from '../database/firebase.service';
import { mongoUserService } from '../database/mongo.service';
import { v4 as uuidv4 } from 'uuid';

/**
 * BANTAI Personal Memory Engine
 * 
 * Manages user-isolated semantic memories, extracted from interactions or explicitly
 * configured by the user. Enforces strict consent checks (`personalMemoryEnabled`).
 */
export class PersonalMemoryService {
  /**
   * Check if user has personal memory enabled in their settings
   */
  async isMemoryEnabled(userId: string): Promise<boolean> {
    const user = await mongoUserService.findById(userId);
    return user?.learningConsent?.personalMemoryEnabled ?? true;
  }

  /**
   * Extract potential facts/preferences from message content
   */
  async extractAndStoreMemories(
    userId: string,
    messageContent: string,
    conversationId: string
  ): Promise<FirestoreMemory[]> {
    if (!(await this.isMemoryEnabled(userId))) {
      return [];
    }

    const createdMemories: FirestoreMemory[] = [];
    const lower = messageContent.toLowerCase();

    // Pattern 1: User preferences ("I prefer...", "My favorite...")
    if (lower.includes('i prefer') || lower.includes('my preference is')) {
      const mem: FirestoreMemory = {
        id: uuidv4(),
        userId,
        key: `pref_${Date.now()}`,
        category: 'preference',
        content: messageContent,
        confidence: 0.9,
        sourceConversationId: conversationId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await firebaseFirestoreService.createMemory(mem);
      createdMemories.push(mem);
    }

    // Pattern 2: User goals or projects ("I am building...", "My goal is...")
    if (lower.includes('i am working on') || lower.includes('my project is') || lower.includes('my goal is')) {
      const mem: FirestoreMemory = {
        id: uuidv4(),
        userId,
        key: `project_${Date.now()}`,
        category: 'project',
        content: messageContent,
        confidence: 0.95,
        sourceConversationId: conversationId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await firebaseFirestoreService.createMemory(mem);
      createdMemories.push(mem);
    }

    return createdMemories;
  }

  /**
   * Retrieve active memories formatted for injection into system context
   */
  async getFormattedMemoryContext(userId: string): Promise<string> {
    if (!(await this.isMemoryEnabled(userId))) {
      return '';
    }

    const memories = await firebaseFirestoreService.getMemories(userId);
    if (memories.length === 0) return '';

    const lines = memories.slice(0, 10).map(m => `- [${m.category.toUpperCase()}] ${m.content}`);
    return `USER PERSONAL MEMORY (Isolated to current user):\n${lines.join('\n')}`;
  }

  /**
   * Add explicit memory item
   */
  async addMemory(
    userId: string,
    key: string,
    category: MemoryCategory,
    content: string,
    confidence: number = 1.0
  ): Promise<FirestoreMemory> {
    const mem: FirestoreMemory = {
      id: uuidv4(),
      userId,
      key,
      category,
      content,
      confidence,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    return await firebaseFirestoreService.createMemory(mem);
  }

  /**
   * Update memory item
   */
  async updateMemory(
    userId: string,
    memoryId: string,
    updates: Partial<FirestoreMemory>
  ): Promise<FirestoreMemory> {
    return await firebaseFirestoreService.updateMemory(userId, memoryId, updates);
  }

  /**
   * Delete memory item
   */
  async deleteMemory(userId: string, memoryId: string): Promise<boolean> {
    return await firebaseFirestoreService.deleteMemory(userId, memoryId);
  }

  /**
   * Clear all memories for user
   */
  async clearAll(userId: string): Promise<number> {
    return await firebaseFirestoreService.clearAllMemories(userId);
  }
}

export const personalMemoryService = new PersonalMemoryService();
