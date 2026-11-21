import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { firebaseFirestoreService } from '../services/database/firebase.service';
import { inferenceService } from '../services/ai/inference.service';
import { personalMemoryService } from '../services/memory/memory.service';
import { ragService } from '../services/rag/rag.service';
import {
  CreateConversationSchema,
  SendMessageRequestSchema,
  MessageFeedbackSchema,
  FirestoreConversation,
  FirestoreMessage,
  ChatStreamChunk
} from '@bantai/shared';

export class ChatController {
  async createConversation(req: AuthenticatedRequest, res: Response) {
    try {
      const parsed = CreateConversationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: parsed.error.issues[0].message });
      }

      const userId = req.user!.userId;
      const now = new Date().toISOString();
      const conversationId = uuidv4();

      const conv: FirestoreConversation = {
        id: conversationId,
        userId,
        title: parsed.data.title || 'New Conversation',
        personalityMode: parsed.data.personalityMode,
        modelId: parsed.data.modelId,
        messageCount: 0,
        isArchived: false,
        isPinned: false,
        createdAt: now,
        updatedAt: now,
        lastMessageAt: now
      };

      const created = await firebaseFirestoreService.createConversation(conv);
      return res.status(201).json({ success: true, data: created });
    } catch (err) {
      return res.status(500).json({ success: false, error: (err as Error).message });
    }
  }

  async getConversations(req: AuthenticatedRequest, res: Response) {
    try {
      const list = await firebaseFirestoreService.getConversations(req.user!.userId);
      return res.json({ success: true, data: list });
    } catch (err) {
      return res.status(500).json({ success: false, error: (err as Error).message });
    }
  }

  async getConversationMessages(req: AuthenticatedRequest, res: Response) {
    try {
      const convId = req.params.id;
      const messages = await firebaseFirestoreService.getMessages(req.user!.userId, convId);
      return res.json({ success: true, data: messages });
    } catch (err) {
      return res.status(500).json({ success: false, error: (err as Error).message });
    }
  }

  async deleteConversation(req: AuthenticatedRequest, res: Response) {
    try {
      const convId = req.params.id;
      const deleted = await firebaseFirestoreService.deleteConversation(req.user!.userId, convId);
      return res.json({ success: deleted });
    } catch (err) {
      return res.status(500).json({ success: false, error: (err as Error).message });
    }
  }

  async recordFeedback(req: AuthenticatedRequest, res: Response) {
    try {
      const parsed = MessageFeedbackSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: parsed.error.issues[0].message });
      }

      const { messageId, rating, reason, correctionText } = parsed.data;
      const ok = await firebaseFirestoreService.recordFeedback(req.user!.userId, messageId, {
        rating,
        reason,
        correctionText,
        submittedAt: new Date().toISOString()
      });

      return res.json({ success: ok });
    } catch (err) {
      return res.status(500).json({ success: false, error: (err as Error).message });
    }
  }

  /**
   * Streaming Chat SSE Endpoint
   */
  async streamChat(req: AuthenticatedRequest, res: Response) {
    try {
      const parsed = SendMessageRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: parsed.error.issues[0].message });
      }

      const userId = req.user!.userId;
      const { conversationId, content, personalityMode, modelId } = parsed.data;

      // Verify conversation ownership
      const conv = await firebaseFirestoreService.getConversationById(userId, conversationId);
      if (!conv) {
        return res.status(404).json({ success: false, error: 'Conversation not found' });
      }

      const activeMode = personalityMode || conv.personalityMode || 'tapori';
      const activeModel = modelId || conv.modelId || 'qwen2.5:7b';
      const now = new Date().toISOString();

      // 1. Save User Message in Firestore
      const userMessageId = uuidv4();
      const userMessage: FirestoreMessage = {
        id: userMessageId,
        conversationId,
        userId,
        role: 'user',
        content,
        personalityMode: activeMode,
        createdAt: now
      };
      await firebaseFirestoreService.addMessage(userMessage);

      // Auto-extract personal memories in background if enabled
      personalMemoryService.extractAndStoreMemories(userId, content, conversationId).catch(console.error);

      // 2. Retrieve contextual memory and RAG additions
      const memoryContext = await personalMemoryService.getFormattedMemoryContext(userId);
      const ragResults = await ragService.searchRelevant(userId, content, 2);
      let contextAdditions = memoryContext;

      if (ragResults.length > 0) {
        const ragContext = `RELEVANT KNOWLEDGE BASE PASSAGES:\n` +
          ragResults.map(r => `- ${r.chunk.text}`).join('\n');
        contextAdditions = contextAdditions ? `${contextAdditions}\n\n${ragContext}` : ragContext;
      }

      // Fetch history messages
      const history = await firebaseFirestoreService.getMessages(userId, conversationId);

      // 3. Setup Server-Sent Events headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      const assistantMsgId = uuidv4();
      let assistantContent = '';

      // 4. Stream from self-hosted inference service
      assistantContent = await inferenceService.streamChat(
        {
          conversationId,
          personalityMode: activeMode,
          modelId: activeModel,
          messages: history,
          contextAdditions
        },
        (chunk: ChatStreamChunk) => {
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }
      );

      // 5. Save final Assistant Message to Firestore
      const assistantMessage: FirestoreMessage = {
        id: assistantMsgId,
        conversationId,
        userId,
        role: 'assistant',
        content: assistantContent,
        personalityMode: activeMode,
        modelUsed: activeModel,
        createdAt: new Date().toISOString()
      };
      await firebaseFirestoreService.addMessage(assistantMessage);

      // Update conversation title if first message
      if (conv.messageCount <= 2 && content.length > 0) {
        const newTitle = content.substring(0, 36) + (content.length > 36 ? '...' : '');
        await firebaseFirestoreService.updateConversation(userId, conversationId, { title: newTitle });
      }

      res.end();
    } catch (err) {
      console.error('[ChatController] streamChat error:', err);
      if (!res.headersSent) {
        return res.status(500).json({ success: false, error: (err as Error).message });
      }
      res.write(`data: ${JSON.stringify({ type: 'error', error: (err as Error).message })}\n\n`);
      res.end();
    }
  }
}

export const chatController = new ChatController();
