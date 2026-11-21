import { Router } from 'express';
import { assistantController } from '../controllers/assistant.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

// Tasks
router.get('/tasks', (req, res) => assistantController.getTasks(req, res));
router.post('/tasks', (req, res) => assistantController.createTask(req, res));
router.patch('/tasks/:id', (req, res) => assistantController.updateTask(req, res));
router.delete('/tasks/:id', (req, res) => assistantController.deleteTask(req, res));

// Reminders
router.get('/reminders', (req, res) => assistantController.getReminders(req, res));
router.post('/reminders', (req, res) => assistantController.createReminder(req, res));
router.delete('/reminders/:id', (req, res) => assistantController.deleteReminder(req, res));

// Calendar Events
router.get('/calendar', (req, res) => assistantController.getCalendarEvents(req, res));
router.post('/calendar', (req, res) => assistantController.createCalendarEvent(req, res));

// Personal Memory
router.get('/memory', (req, res) => assistantController.getMemories(req, res));
router.post('/memory', (req, res) => assistantController.createMemory(req, res));
router.patch('/memory/:id', (req, res) => assistantController.updateMemory(req, res));
router.delete('/memory/:id', (req, res) => assistantController.deleteMemory(req, res));
router.delete('/memory-clear-all', (req, res) => assistantController.clearAllMemories(req, res));

// Knowledge Base & RAG
router.get('/knowledge/docs', (req, res) => assistantController.getKnowledgeDocs(req, res));
router.post('/knowledge/upload', (req, res) => assistantController.uploadKnowledgeDoc(req, res));
router.post('/knowledge/query', (req, res) => assistantController.queryKnowledge(req, res));

// Agentic Execution
router.post('/agent/plan', (req, res) => assistantController.createAgentPlan(req, res));
router.post('/agent/execute/:planId', (req, res) => assistantController.executeAgentPlan(req, res));
router.post('/agent/approve-step', (req, res) => assistantController.approveAgentStep(req, res));

export default router;
