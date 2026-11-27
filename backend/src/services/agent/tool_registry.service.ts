import { ToolDefinition, TOOL_NAMES } from '@bantai/shared';
import { firebaseFirestoreService } from '../database/firebase.service';
import { ragService } from '../rag/rag.service';
import { buildEmlDocument, mailerService } from '../mail/mailer.service';
import crypto from 'crypto';
import { evaluateSafeMathExpression, executeInIsolatedSubprocess } from './safe_eval';

function formatIcsDate(isoInput: string): string {
  const dt = new Date(isoInput);
  const valid = Number.isNaN(dt.getTime()) ? new Date() : dt;
  return valid.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function escapeIcsText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function buildIcsEvent(params: {
  uid: string;
  title: string;
  startTime: string;
  endTime: string;
  description?: string;
}): string {
  const dtStamp = formatIcsDate(new Date().toISOString());
  const dtStart = formatIcsDate(params.startTime);
  const dtEnd = formatIcsDate(params.endTime);

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BANTAI//Sovereign Calendar Connector//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${params.uid}@bantai.local`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcsText(params.title)}`,
    ...(params.description ? [`DESCRIPTION:${escapeIcsText(params.description)}`] : []),
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}

export interface ToolExecutionContext {
  userId: string;
  conversationId?: string;
  userApproved?: boolean;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  requiresApproval?: boolean;
  approvalPrompt?: string;
}

/**
 * BANTAI Agent Tool Registry
 * Implements 10 production-grade tools with argument validation, sandboxing,
 * and human-in-the-loop authorization gates.
 */
export class ToolRegistryService {
  private tools: Map<string, ToolDefinition> = new Map();

  constructor() {
    this.registerStandardTools();
  }

  private registerStandardTools() {
    // 1. Calculator
    this.register({
      name: TOOL_NAMES.CALCULATOR,
      description: 'Perform exact mathematical calculations and numeric formula evaluations.',
      parameters: {
        type: 'object',
        properties: {
          expression: { type: 'string', description: 'Mathematical expression, e.g. "(145 * 2.5) + Math.sqrt(64)"' }
        },
        required: ['expression']
      },
      requiresApproval: false,
      category: 'productivity'
    });

    // 2. Document Reader
    this.register({
      name: TOOL_NAMES.DOCUMENT_READER,
      description: 'Read and extract full content or preview of an uploaded document by docId.',
      parameters: {
        type: 'object',
        properties: {
          docId: { type: 'string', description: 'Unique ID of the document to inspect' }
        },
        required: ['docId']
      },
      requiresApproval: false,
      category: 'retrieval'
    });

    // 3. File Search
    this.register({
      name: TOOL_NAMES.FILE_SEARCH,
      description: 'Search across all personal uploaded documents matching keywords.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Keyword or filename search string' }
        },
        required: ['query']
      },
      requiresApproval: false,
      category: 'retrieval'
    });

    // 4. Database Retrieval
    this.register({
      name: TOOL_NAMES.DATABASE_RETRIEVAL,
      description: 'Query personal records (tasks, reminders, calendar events, memories).',
      parameters: {
        type: 'object',
        properties: {
          entityType: { type: 'string', enum: ['tasks', 'reminders', 'calendar', 'memories'], description: 'Collection to query' },
          filter: { type: 'string', description: 'Optional status filter, e.g. "pending", "scheduled"' }
        },
        required: ['entityType']
      },
      requiresApproval: false,
      category: 'retrieval'
    });

    // 5. RAG Retrieval
    this.register({
      name: TOOL_NAMES.RAG_RETRIEVAL,
      description: 'Retrieve semantically relevant chunks from the personal vector knowledge base.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Natural language search query' },
          topK: { type: 'number', description: 'Number of chunks to return (default 3)' }
        },
        required: ['query']
      },
      requiresApproval: false,
      category: 'retrieval'
    });

    // 6. Sandboxed Code Executor
    this.register({
      name: TOOL_NAMES.SANDBOX_CODE_EXECUTOR,
      description: 'Execute JavaScript code within an isolated Node.js VM sandbox with strict timeouts.',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'Clean JavaScript code to execute inside sandbox' }
        },
        required: ['code']
      },
      requiresApproval: true, // Requires user confirmation
      category: 'execution'
    });

    // 7. Task Manager
    this.register({
      name: TOOL_NAMES.TASK_MANAGER,
      description: 'Create, update, or complete tasks in the personal task registry.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['create', 'complete', 'list'], description: 'Action to execute' },
          title: { type: 'string', description: 'Task title (for create)' },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
          taskId: { type: 'string', description: 'Task ID (for complete)' }
        },
        required: ['action']
      },
      requiresApproval: false,
      category: 'assistant'
    });

    // 8. Reminder Scheduler
    this.register({
      name: TOOL_NAMES.REMINDER_SCHEDULER,
      description: 'Schedule a verified notification reminder with date, time, and timezone awareness.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Reminder description' },
          scheduledTime: { type: 'string', description: 'ISO 8601 string for reminder trigger' },
          timezone: { type: 'string', description: 'User timezone, e.g. "Asia/Kolkata"' }
        },
        required: ['title', 'scheduledTime']
      },
      requiresApproval: false,
      category: 'assistant'
    });

    // 9. Calendar Connector
    this.register({
      name: TOOL_NAMES.CALENDAR_CONNECTOR,
      description: 'View upcoming calendar events and create new schedule entries.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['view', 'create'], description: 'Calendar operation' },
          title: { type: 'string', description: 'Event title' },
          startTime: { type: 'string', description: 'ISO start datetime' },
          endTime: { type: 'string', description: 'ISO end datetime' }
        },
        required: ['action']
      },
      requiresApproval: false,
      category: 'assistant'
    });

    // 10. Email Connector
    this.register({
      name: TOOL_NAMES.EMAIL_CONNECTOR,
      description: 'Draft or search emails. Sending emails MANDATES explicit user authorization.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['draft', 'search', 'send'], description: 'Email action' },
          to: { type: 'string', description: 'Recipient email address' },
          subject: { type: 'string', description: 'Subject line' },
          body: { type: 'string', description: 'Email body text' },
          draftId: { type: 'string', description: 'Draft ID if sending existing draft' }
        },
        required: ['action']
    },
    requiresApproval: false, // Draft/search permitted directly; action === 'send' enforces explicit approval gate
    category: 'assistant'
    });
  }

  register(def: ToolDefinition) {
    this.tools.set(def.name, def);
  }

  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  getAllTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Execute a tool with sandboxing and authorization verification
   */
  async executeTool(
    name: string,
    args: Record<string, unknown>,
    ctx: ToolExecutionContext
  ): Promise<ToolResult> {
    const def = this.getTool(name);
    if (!def) {
      return { success: false, error: `Tool '${name}' not found in registry.` };
    }

    // Check if tool requires approval and user hasn't approved it yet
    if (def.requiresApproval && !ctx.userApproved) {
      return {
        success: false,
        requiresApproval: true,
        approvalPrompt: `Sensitive tool action '${name}' requires your explicit authorization before execution.`
      };
    }

    try {
      switch (name) {
        case TOOL_NAMES.CALCULATOR: {
          const expr = String(args.expression || '');
          const result = evaluateSafeMathExpression(expr);
          return { success: true, data: { expression: expr, result } };
        }

        case TOOL_NAMES.DOCUMENT_READER: {
          const docId = String(args.docId || '');
          const docs = await firebaseFirestoreService.getKnowledgeDocs(ctx.userId);
          const found = docs.find(d => d.id === docId);
          if (!found) return { success: false, error: `Document ${docId} not found` };
          return { success: true, data: found };
        }

        case TOOL_NAMES.FILE_SEARCH: {
          const query = String(args.query || '').toLowerCase();
          const docs = await firebaseFirestoreService.getKnowledgeDocs(ctx.userId);
          const matched = docs.filter(d => d.originalName.toLowerCase().includes(query) || (d.summary && d.summary.toLowerCase().includes(query)));
          return { success: true, data: matched };
        }

        case TOOL_NAMES.DATABASE_RETRIEVAL: {
          const entity = String(args.entityType || '');
          if (entity === 'tasks') {
            const tasks = await firebaseFirestoreService.getTasks(ctx.userId);
            return { success: true, data: tasks };
          }
          if (entity === 'reminders') {
            const reminders = await firebaseFirestoreService.getReminders(ctx.userId);
            return { success: true, data: reminders };
          }
          if (entity === 'calendar') {
            const events = await firebaseFirestoreService.getCalendarEvents(ctx.userId);
            return { success: true, data: events };
          }
          if (entity === 'memories') {
            const mems = await firebaseFirestoreService.getMemories(ctx.userId);
            return { success: true, data: mems };
          }
          return { success: false, error: `Unknown entityType '${entity}'` };
        }

        case TOOL_NAMES.RAG_RETRIEVAL: {
          const q = String(args.query || '');
          const rawTopK = Number(args.topK);
          const topK = Number.isFinite(rawTopK) ? Math.max(1, Math.min(20, Math.floor(rawTopK))) : 3;
          const results = await ragService.searchRelevant(ctx.userId, q, topK);
          return {
            success: true,
            data: results.map(r => ({ text: r.chunk.text, score: r.score, docId: r.chunk.docId }))
          };
        }

        case TOOL_NAMES.SANDBOX_CODE_EXECUTOR: {
          const code = String(args.code || '');
          const result = await executeInIsolatedSubprocess(code);
          if (result.error) {
            return { success: false, error: result.error, data: { logs: result.logs } };
          }
          return { success: true, data: { output: result.output, logs: result.logs } };
        }

        case TOOL_NAMES.TASK_MANAGER: {
          const action = String(args.action || 'list');
          if (action === 'create') {
            const title = String(args.title || 'Untitled Task');
            const priority = (args.priority as 'low'|'medium'|'high'|'urgent') || 'medium';
            const newTask = await firebaseFirestoreService.createTask({
              id: crypto.randomUUID(),
              userId: ctx.userId,
              title,
              priority,
              status: 'pending',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
            return { success: true, data: { action: 'created', task: newTask } };
          }
          if (action === 'complete') {
            const taskId = String(args.taskId || '');
            const updated = await firebaseFirestoreService.updateTask(ctx.userId, taskId, { status: 'completed' });
            return { success: true, data: { action: 'completed', task: updated } };
          }
          const list = await firebaseFirestoreService.getTasks(ctx.userId);
          return { success: true, data: list };
        }

        case TOOL_NAMES.REMINDER_SCHEDULER: {
          const title = String(args.title || '');
          const scheduledTime = String(args.scheduledTime || '');
          const timezone = String(args.timezone || 'Asia/Kolkata');
          const rem = await firebaseFirestoreService.createReminder({
            id: crypto.randomUUID(),
            userId: ctx.userId,
            title,
            scheduledTime,
            timezone,
            status: 'scheduled',
            channel: 'in_app',
            createdAt: new Date().toISOString()
          });
          return { success: true, data: { scheduled: true, reminder: rem } };
        }

        case TOOL_NAMES.CALENDAR_CONNECTOR: {
          const action = String(args.action || 'view');
          if (action === 'create') {
            const eventId = crypto.randomUUID();
            const title = String(args.title || 'Meeting');
            const startTime = String(args.startTime || new Date().toISOString());
            const endTime = String(args.endTime || new Date(Date.now() + 3600000).toISOString());
            const evt = await firebaseFirestoreService.createCalendarEvent({
              id: eventId,
              userId: ctx.userId,
              title,
              startTime,
              endTime,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
            const icsContent = buildIcsEvent({
              uid: eventId,
              title,
              startTime,
              endTime,
              description: typeof args.description === 'string' ? args.description : undefined
            });
            return {
              success: true,
              data: {
                created: true,
                event: evt,
                icsContent,
                filename: `bantai_event_${eventId.slice(0, 8)}.ics`,
                mimeType: 'text/calendar'
              }
            };
          }
          const events = await firebaseFirestoreService.getCalendarEvents(ctx.userId);
          return { success: true, data: events };
        }

        case TOOL_NAMES.EMAIL_CONNECTOR: {
          const action = String(args.action || 'draft');
          if (action === 'draft') {
            const draftId = crypto.randomUUID();
            const toAddr = String(args.to || '');
            const subject = String(args.subject || 'No Subject');
            const body = String(args.body || '');
            const draft = await firebaseFirestoreService.createEmailDraft({
              id: draftId,
              userId: ctx.userId,
              to: [toAddr],
              subject,
              body,
              status: 'draft',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
            const emlContent = buildEmlDocument({ to: toAddr || 'undisclosed-recipients:;', subject, body });
            return {
              success: true,
              data: {
                draftCreated: true,
                draft,
                emlContent,
                filename: `bantai_draft_${draftId.slice(0, 8)}.eml`,
                mimeType: 'message/rfc822'
              }
            };
          }
          if (action === 'send') {
            if (!ctx.userApproved) {
              return {
                success: false,
                requiresApproval: true,
                approvalPrompt: `Confirm sending email to ${args.to} with subject "${args.subject}"?`
              };
            }
            const toAddr = String(args.to || '').trim();
            if (!toAddr || !toAddr.includes('@')) {
              return { success: false, error: 'A valid recipient email address is required to send mail.' };
            }
            const subject = String(args.subject || 'Update from BANTAI');
            const body = String(args.body || '');
            const dispatch = await mailerService.sendMail({ to: toAddr, subject, text: body });
            return {
              success: true,
              data: {
                sent: dispatch.delivered,
                transport: dispatch.transport,
                messageId: dispatch.messageId,
                to: toAddr,
                subject,
                emlContent: dispatch.emlContent,
                filename: `bantai_sent_${Date.now()}.eml`,
                mimeType: 'message/rfc822',
                timestamp: new Date().toISOString()
              }
            };
          }
          const drafts = await firebaseFirestoreService.getEmailDrafts(ctx.userId);
          return { success: true, data: drafts };
        }

        default:
          return { success: false, error: `Unhandled tool '${name}'` };
      }
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }
}

export const toolRegistryService = new ToolRegistryService();
