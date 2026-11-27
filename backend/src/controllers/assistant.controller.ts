import { Response } from 'express';
import crypto from 'crypto';
import path from 'path';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { firebaseFirestoreService } from '../services/database/firebase.service';
import { personalMemoryService } from '../services/memory/memory.service';
import { ragService } from '../services/rag/rag.service';
import { extractTextFromPdfBase64, PdfExtractionError } from '../services/rag/pdf_extractor';
import { agentPlannerService } from '../services/agent/planner.service';
import { sendInternalError, sendResourceError } from '../utils/security';
import {
  CreateTaskSchema,
  UpdateTaskSchema,
  CreateReminderSchema,
  CreateCalendarEventSchema,
  CreateMemorySchema,
  UpdateMemorySchema,
  UploadKnowledgeDocSchema,
  QueryKnowledgeSchema,
  CreateAgentPlanSchema,
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
        id: crypto.randomUUID(),
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
      return sendResourceError(res, 'AssistantController.updateTask', err);
    }
  }

  async deleteTask(req: AuthenticatedRequest, res: Response) {
    try {
      const deleted = await firebaseFirestoreService.deleteTask(req.user!.userId, req.params.id);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Task not found' });
      }
      return res.json({ success: true });
    } catch (err) {
      return sendInternalError(res, 'AssistantController.deleteTask', err);
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
        id: crypto.randomUUID(),
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
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Reminder not found' });
      }
      return res.json({ success: true });
    } catch (err) {
      return sendInternalError(res, 'AssistantController.deleteReminder', err);
    }
  }

  // --- CALENDAR EVENTS ---
  async getCalendarEvents(req: AuthenticatedRequest, res: Response) {
    try {
      const events = await firebaseFirestoreService.getCalendarEvents(req.user!.userId);
      return res.json({ success: true, data: events });
    } catch (err) {
      return sendInternalError(res, 'AssistantController.getCalendarEvents', err);
    }
  }

  async createCalendarEvent(req: AuthenticatedRequest, res: Response) {
    try {
      const parsed = CreateCalendarEventSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: parsed.error.issues[0].message });
      }

      const { title, startTime, endTime, description, location } = parsed.data;
      if (new Date(endTime).getTime() <= new Date(startTime).getTime()) {
        return res.status(400).json({ success: false, error: 'endTime must be after startTime' });
      }

      const now = new Date().toISOString();
      const event = {
        id: crypto.randomUUID(),
        userId: req.user!.userId,
        title,
        description,
        startTime,
        endTime,
        location,
        createdAt: now,
        updatedAt: now
      };

      const created = await firebaseFirestoreService.createCalendarEvent(event);
      return res.status(201).json({ success: true, data: created });
    } catch (err) {
      return sendInternalError(res, 'AssistantController.createCalendarEvent', err);
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
      return sendResourceError(res, 'AssistantController.updateMemory', err);
    }
  }

  async deleteMemory(req: AuthenticatedRequest, res: Response) {
    try {
      const ok = await personalMemoryService.deleteMemory(req.user!.userId, req.params.id);
      if (!ok) {
        return res.status(404).json({ success: false, error: 'Memory not found' });
      }
      return res.json({ success: true });
    } catch (err) {
      return sendInternalError(res, 'AssistantController.deleteMemory', err);
    }
  }

  async clearAllMemories(req: AuthenticatedRequest, res: Response) {
    try {
      const count = await personalMemoryService.clearAll(req.user!.userId);
      return res.json({ success: true, clearedCount: count });
    } catch (err) {
      return sendInternalError(res, 'AssistantController.clearAllMemories', err);
    }
  }

  // --- KNOWLEDGE BASE & RAG ---
  async getKnowledgeDocs(req: AuthenticatedRequest, res: Response) {
    try {
      const docs = await firebaseFirestoreService.getKnowledgeDocs(req.user!.userId);
      return res.json({ success: true, data: docs });
    } catch (err) {
      return sendInternalError(res, 'AssistantController.getKnowledgeDocs', err);
    }
  }

  async uploadKnowledgeDoc(req: AuthenticatedRequest, res: Response) {
    try {
      const parsed = UploadKnowledgeDocSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: parsed.error.issues[0].message });
      }

      const safeOriginalName = path.basename(parsed.data.filename).replace(/[^a-zA-Z0-9._-]/g, '_');
      const { mimeType, rawPdfBase64 } = parsed.data;
      let rawText = (parsed.data.rawText || '').trim();
      let sizeBytes = Buffer.byteLength(rawText, 'utf8');

      if (rawPdfBase64 || mimeType === 'application/pdf' || /\.pdf$/i.test(safeOriginalName)) {
        if (!rawPdfBase64) {
          return res.status(400).json({
            success: false,
            error: 'PDF uploads require a base64-encoded PDF payload (`rawPdfBase64`).'
          });
        }
        try {
          const pdfRes = await extractTextFromPdfBase64(rawPdfBase64);
          rawText = pdfRes.text;
          sizeBytes = pdfRes.byteLength;
        } catch (pdfErr) {
          if (pdfErr instanceof PdfExtractionError) {
            return res.status(400).json({ success: false, error: pdfErr.message });
          }
          throw pdfErr;
        }
      }

      const userId = req.user!.userId;
      const docId = crypto.randomUUID();

      const doc: FirestoreKnowledgeDoc = {
        id: docId,
        userId,
        filename: `${docId}_${safeOriginalName}`,
        originalName: safeOriginalName,
        mimeType: rawPdfBase64 ? 'application/pdf' : mimeType,
        sizeBytes,
        storageUrl: `local://storage/${docId}`,
        chunkCount: 0,
        embeddingModel: 'hybrid-bm25+cosine-v1',
        summary: rawText.substring(0, 160) + (rawText.length > 160 ? '...' : ''),
        createdAt: new Date().toISOString()
      };

      const chunksIngested = await ragService.ingestDocument(userId, doc, rawText);
      doc.chunkCount = chunksIngested;

      const created = await firebaseFirestoreService.addKnowledgeDoc(doc);
      return res.status(201).json({ success: true, data: created });
    } catch (err) {
      return sendInternalError(res, 'AssistantController.uploadKnowledgeDoc', err);
    }
  }

  async queryKnowledge(req: AuthenticatedRequest, res: Response) {
    try {
      const parsed = QueryKnowledgeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: parsed.error.issues[0].message });
      }
      const results = await ragService.searchRelevant(req.user!.userId, parsed.data.query, parsed.data.topK);
      return res.json({ success: true, data: results });
    } catch (err) {
      return sendInternalError(res, 'AssistantController.queryKnowledge', err);
    }
  }

  // --- AGENTIC EXECUTION ---
  async listAgentPlans(req: AuthenticatedRequest, res: Response) {
    try {
      const plans = await agentPlannerService.listPlans(req.user!.userId);
      return res.json({ success: true, data: plans });
    } catch (err) {
      return sendInternalError(res, 'AssistantController.listAgentPlans', err);
    }
  }

  async createAgentPlan(req: AuthenticatedRequest, res: Response) {
    try {
      const parsed = CreateAgentPlanSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: parsed.error.issues[0].message });
      }

      const convId = parsed.data.conversationId || 'default';
      if (convId !== 'default') {
        const ownedConv = await firebaseFirestoreService.getConversationById(req.user!.userId, convId);
        if (!ownedConv) {
          return res.status(404).json({ success: false, error: 'Conversation not found' });
        }
      }

      const plan = await agentPlannerService.createPlan(
        req.user!.userId,
        convId,
        parsed.data.goal
      );
      return res.status(201).json({ success: true, data: plan });
    } catch (err) {
      return sendInternalError(res, 'AssistantController.createAgentPlan', err);
    }
  }

  async executeAgentPlan(req: AuthenticatedRequest, res: Response) {
    try {
      const plan = await agentPlannerService.executePlan(req.params.planId, req.user!.userId);
      return res.json({ success: true, data: plan });
    } catch (err) {
      return sendResourceError(res, 'AssistantController.executeAgentPlan', err);
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
      return sendResourceError(res, 'AssistantController.approveAgentStep', err);
    }
  }
}

export const assistantController = new AssistantController();
