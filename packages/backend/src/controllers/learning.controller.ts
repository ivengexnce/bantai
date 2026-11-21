import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { learningService } from '../services/learning/learning.service';
import { mongoUserService } from '../services/database/mongo.service';
import { firebaseFirestoreService } from '../services/database/firebase.service';
import { inferenceService } from '../services/ai/inference.service';
import { SUPPORTED_MODELS } from '@bantai/shared';

export class LearningController {
  async getStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const user = await mongoUserService.findById(req.user!.userId);
      const backendStatus = await inferenceService.checkLocalBackendStatus();

      return res.json({
        success: true,
        data: {
          crossUserTrainingOptIn: user?.learningConsent?.crossUserTrainingOptIn ?? false,
          personalMemoryEnabled: user?.learningConsent?.personalMemoryEnabled ?? true,
          consentTimestamp: user?.learningConsent?.consentTimestamp ?? null,
          policyVersion: user?.learningConsent?.policyVersion ?? '1.0.0-2026',
          inferenceBackend: backendStatus
        }
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: (err as Error).message });
    }
  }

  async exportDataset(req: AuthenticatedRequest, res: Response) {
    try {
      const user = await mongoUserService.findById(req.user!.userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin access required to export training datasets.' });
      }

      const manifest = await learningService.exportDatasetSplits();
      return res.json({ success: true, data: manifest });
    } catch (err) {
      return res.status(500).json({ success: false, error: (err as Error).message });
    }
  }

  async getModels(_req: AuthenticatedRequest, res: Response) {
    try {
      const backendStatus = await inferenceService.checkLocalBackendStatus();
      return res.json({
        success: true,
        data: {
          backend: backendStatus,
          supportedModels: SUPPORTED_MODELS
        }
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: (err as Error).message });
    }
  }

  async wipeUserData(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      // 1. Wipe all conversation and application data from Firebase
      await firebaseFirestoreService.wipeAllUserData(userId);
      // 2. Wipe user account from MongoDB
      await mongoUserService.deleteUserAccount(userId);

      return res.json({
        success: true,
        message: 'All user data across MongoDB and Firebase has been permanently and securely erased.'
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: (err as Error).message });
    }
  }
}

export const learningController = new LearningController();
