import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { firebaseFirestoreService } from '../services/database/firebase.service';
import { personalMemoryService } from '../services/memory/memory.service';
import { ragService } from '../services/rag/rag.service';
import { agentPlannerService } from '../services/agent/planner.service';
import {
  CreateTaskSchema,
  UpdateTaskSchema,
  CreateReminderSchema,
  CreateMemorySchema,
  UpdateMemorySchema,
  ToolApprovalSchema,
  FirestoreTask,
  FirestoreReminder,
  FirestoreKnowledgeDoc
} from '@bantai/shared';

export class AssistantController {
  // --- TASKS ---
  async getTasks(req: AuthenticatedRequest, res: Response) {
    try {
      const tasks = await firebaseFirestoreService.getTasks(req.user!.userId);
      return res.json({ success: true, data: tasks });
    } catch (err) {
      return res.status(500).json({ success: false, error: (err as Error).message });
    }
  }

  async createTask(req: AuthenticatedRequest, res: Response) {
    try {
      const parsed = CreateTaskSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: parsed.error.issues[0].message });
      }

      const now = new Date().toISOString();
      const task: FirestoreTask = {
        id: uuidv4(),
        userId: req.user!.userId,
        title: parsed.data.title,
        description: parsed.data.description,
        priority: parsed.data.priority,
        status: 'pending',
        dueDate: parsed.data.dueDate,
        subtasks: parsed.data.subtasks,
        tags: parsed.data.tags,
        recurring: parsed.data.recurring,
        createdAt: now,
        updatedAt: now
      };

      const created = await firebaseFirestoreService.createTask(task);
      return res.status(201).json({ success: true, data: created });
    } catch (err) {
      return res.status(500).json({ success: false, error: (err as Error).message });
    }
  }

  async updateTask(req: AuthenticatedRequest, res: Response) {
    try {
      const parsed = UpdateTaskSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: parsed.error.issues[0].message });
      }

      const updated = await firebaseFirestoreService.updateTask(
        req.user!.userId,
        req.params.id,
        parsed.data as Partial<FirestoreTask>
      );
      return res.json({ success: true, data: updated });
    } catch (err) {
      return res.status(500).json({ success: false, error: (err as Error).message });
    }
  }

  async deleteTask(req: AuthenticatedRequest, res: Response) {
    try {
      const deleted = await firebaseFirestoreService.deleteTask(req.user!.userId, req.params.id);
      return res.json({ success: deleted });
    } catch (err) {
      return res.status(500).json({ success: false, error: (err as Error).message });
    }
  }

  // --- REMINDERS ---
  async getReminders(req: AuthenticatedRequest, res: Response) {
    try {
      const rems = await firebaseFirestoreService.getReminders(req.user!.userId);
      return res.json({ success: true, data: rems });
    } catch (err) {
      return res.status(500).json({ success: false, error: (err as Error).message });
    }
  }

  async createReminder(req: AuthenticatedRequest, res: Response) {
    try {
      const parsed = CreateReminderSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: parsed.error.issues[0].message });
      }

      const reminder: FirestoreReminder = {
        id: uuidv4(),
        userId: req.user!.userId,
        title: parsed.data.title,
        scheduledTime: parsed.data.scheduledTime,
        timezone: parsed.data.timezone,
        recurring: parsed.data.recurring,
        status: 'scheduled',
        channel: parsed.data.channel,
        createdAt: new Date().toISOString()
      };

      const created = await firebaseFirestoreService.createReminder(reminder);
      return res.status(201).json({ success: true, data: created });
    } catch (err) {
      return res.status(500).json({ success: false, error: (err as Error).message });
    }
  }

  async deleteReminder(req: AuthenticatedRequest, res: Response) {
    try {
      const deleted = await firebaseFirestoreService.deleteReminder(req.user!.userId, req.params.id);
      return res.json({ success: deleted });
    } catch (err) {
      return res.status(500).json({ success: false, error: (err as Error).message });
    }
  }

  // --- PERSONAL MEMORY ---
  async getMemories(req: AuthenticatedRequest, res: Response) {
    try {
      const list = await firebaseFirestoreService.getMemories(req.user!.userId);
      return res.json({ success: true, data: list });
    } catch (err) {
      return res.status(500).json({ success: false, error: (err as Error).message });
    }
  }

  async createMemory(req: AuthenticatedRequest, res: Response) {
    try {
      const parsed = CreateMemorySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: parsed.error.issues[0].message });
      }

      const mem = await personalMemoryService.addMemory(
        req.user!.userId,
        parsed.data.key,
        parsed.data.category,
        parsed.data.content,
        parsed.data.confidence
      );
      return res.status(201).json({ success: true, data: mem });
    } catch (err) {
      return res.status(500).json({ success: false, error: (err as Error).message });
    }
  }

  async updateMemory(req: AuthenticatedRequest, res: Response) {
    try {
      const parsed = UpdateMemorySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: parsed.error.issues[0].message });
      }

      const updated = await personalMemoryService.updateMemory(
        req.user!.userId,
        req.params.id,
        parsed.data
      );
      return res.json({ success: true, data: updated });
    } catch (err) {
      return res.status(500).json({ success: false, error: (err as Error).message });
    }
  }

  async deleteMemory(req: AuthenticatedRequest, res: Response) {
    try {
      const ok = await personalMemoryService.deleteMemory(req.user!.userId, req.params.id);
      return res.json({ success: ok });
    } catch (err) {
      return res.status(500).json({ success: false, error: (err as Error).message });
    }
  }

  async clearAllMemories(req: AuthenticatedRequest, res: Response) {
    try {
      const count = await personalMemoryService.clearAll(req.user!.userId);
      return res.json({ success: true, clearedCount: count });
    } catch (err) {
      return res.status(500).json({ success: false, error: (err as Error).message });
    }
  }

  // --- KNOWLEDGE BASE & RAG ---
  async getKnowledgeDocs(req: AuthenticatedRequest, res: Response) {
    try {
      const docs = await firebaseFirestoreService.getKnowledgeDocs(req.user!.userId);
      return res.json({ success: true, data: docs });
    } catch (err) {
      return res.status(500).json({ success: false, error: (err as Error).message });
    }
  }

  async uploadKnowledgeDoc(req: AuthenticatedRequest, res: Response) {
    try {
      const { filename, rawText, mimeType } = req.body;
      if (!filename || !rawText) {
        return res.status(400).json({ success: false, error: 'Filename and rawText are required' });
      }

      const userId = req.user!.userId;
      const docId = uuidv4();

      const doc: FirestoreKnowledgeDoc = {
        id: docId,
        userId,
        filename: `${docId}_${filename}`,
        originalName: filename,
        mimeType: mimeType || 'text/plain',
        sizeBytes: Buffer.byteLength(rawText, 'utf8'),
        storageUrl: `local://storage/${docId}`,
        chunkCount: 0,
        embeddingModel: 'BAAI/bge-small-en-v1.5',
        summary: rawText.substring(0, 160) + '...',
        createdAt: new Date().toISOString()
      };

      const chunksIngested = await ragService.ingestDocument(userId, doc, rawText);
      doc.chunkCount = chunksIngested;

      const created = await firebaseFirestoreService.addKnowledgeDoc(doc);
      return res.status(201).json({ success: true, data: created });
    } catch (err) {
      return res.status(500).json({ success: false, error: (err as Error).message });
    }
  }

  async queryKnowledge(req: AuthenticatedRequest, res: Response) {
    try {
      const { query, topK } = req.body;
      if (!query) {
        return res.status(400).json({ success: false, error: 'Search query required' });
      }
      const results = await ragService.searchRelevant(req.user!.userId, query, topK || 3);
      return res.json({ success: true, data: results });
    } catch (err) {
      return res.status(500).json({ success: false, error: (err as Error).message });
    }
  }

  // --- AGENTIC EXECUTION ---
  async createAgentPlan(req: AuthenticatedRequest, res: Response) {
    try {
      const { goal, conversationId } = req.body;
      if (!goal) return res.status(400).json({ success: false, error: 'Goal is required' });

      const plan = await agentPlannerService.createPlan(
        req.user!.userId,
        conversationId || 'default',
        goal
      );
      return res.status(201).json({ success: true, data: plan });
    } catch (err) {
      return res.status(500).json({ success: false, error: (err as Error).message });
    }
  }

  async executeAgentPlan(req: AuthenticatedRequest, res: Response) {
    try {
      const plan = await agentPlannerService.executePlan(req.params.planId, req.user!.userId);
      return res.json({ success: true, data: plan });
    } catch (err) {
      return res.status(500).json({ success: false, error: (err as Error).message });
    }
  }

  async approveAgentStep(req: AuthenticatedRequest, res: Response) {
    try {
      const parsed = ToolApprovalSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: parsed.error.issues[0].message });
      }

      const plan = await agentPlannerService.approveStep(
        parsed.data.planId,
        parsed.data.stepIndex,
        req.user!.userId,
        parsed.data.approved
      );
      return res.json({ success: true, data: plan });
    } catch (err) {
      return res.status(500).json({ success: false, error: (err as Error).message });
    }
  }
}

export const assistantController = new AssistantController();
