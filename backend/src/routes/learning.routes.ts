import { Router } from 'express';
import { learningController } from '../controllers/learning.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { authRateLimiter } from '../middleware/rate-limit.middleware';

const router = Router();

router.use(requireAuth);

router.get('/status', (req, res) => learningController.getStatus(req, res));
router.post('/export-dataset', requireRole('admin'), (req, res) => learningController.exportDataset(req, res));
router.get('/models', (req, res) => learningController.getModels(req, res));
router.post('/wipe-data', authRateLimiter, (req, res) => learningController.wipeUserData(req, res));

export default router;
