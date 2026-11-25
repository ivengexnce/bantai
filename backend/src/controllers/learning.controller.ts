import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { learningService } from '../services/learning/learning.service';
import { mongoUserService } from '../services/database/mongo.service';
import { firebaseFirestoreService } from '../services/database/firebase.service';
import { inferenceService } from '../services/ai/inference.service';
import { revokeToken } from '../utils/jwt';
import { clearAuthCookies } from '../utils/cookies';
import { sendInternalError } from '../utils/security';
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
      return sendInternalError(res, 'LearningController.getStatus', err);
    }
  }

  async exportDataset(req: AuthenticatedRequest, res: Response) {
    try {
      const user = await mongoUserService.findById(req.user!.userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin access required to export training datasets.' });
      }

      const versionTag = typeof req.body?.versionTag === 'string' ? req.body.versionTag : undefined;
      const manifest = await learningService.exportDatasetSplits(versionTag);
      return res.json({ success: true, data: manifest });
    } catch (err) {
      return sendInternalError(res, 'LearningController.exportDataset', err);
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
      return sendInternalError(res, 'LearningController.getModels', err);
    }
  }

  async wipeUserData(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      await firebaseFirestoreService.wipeAllUserData(userId);
      await mongoUserService.deleteUserAccount(userId);
      revokeToken(req.user!.jti, req.user!.exp);
      clearAuthCookies(res, req);

      return res.json({
        success: true,
        message: 'All user data across MongoDB and Firebase has been permanently and securely erased.'
      });
    } catch (err) {
      return sendInternalError(res, 'LearningController.wipeUserData', err);
    }
  }
}

export const learningController = new LearningController();
