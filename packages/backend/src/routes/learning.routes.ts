import { Router } from 'express';
import { learningController } from '../controllers/learning.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/status', (req, res) => learningController.getStatus(req, res));
router.post('/export-dataset', (req, res) => learningController.exportDataset(req, res));
router.get('/models', (req, res) => learningController.getModels(req, res));
router.post('/wipe-data', (req, res) => learningController.wipeUserData(req, res));

export default router;
