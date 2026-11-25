import { Router } from 'express';
import { chatController } from '../controllers/chat.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { chatRateLimiter } from '../middleware/rate-limit.middleware';

const router = Router();

router.use(requireAuth);

router.post('/conversations', (req, res) => chatController.createConversation(req, res));
router.get('/conversations', (req, res) => chatController.getConversations(req, res));
router.get('/conversations/:id/messages', (req, res) => chatController.getConversationMessages(req, res));
router.delete('/conversations/:id', (req, res) => chatController.deleteConversation(req, res));
router.post('/feedback', (req, res) => chatController.recordFeedback(req, res));
router.post('/stream', chatRateLimiter, (req, res) => chatController.streamChat(req, res));

export default router;
