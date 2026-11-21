import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.post('/signup', (req, res) => authController.signup(req, res));
router.post('/login', (req, res) => authController.login(req, res));
router.post('/google', (req, res) => authController.googleAuth(req, res));
router.post('/logout', (req, res) => authController.logout(req, res));

// Protected Auth Routes
router.get('/me', requireAuth, (req, res) => authController.me(req, res));
router.patch('/preferences', requireAuth, (req, res) => authController.updatePreferences(req, res));
router.patch('/consent', requireAuth, (req, res) => authController.updateConsent(req, res));

export default router;
