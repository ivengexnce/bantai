import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { authRateLimiter } from '../middleware/rate-limit.middleware';

const router = Router();

// Apply strict rate limiting to all auth mutation endpoints
router.post('/signup', authRateLimiter, (req, res) => authController.signup(req, res));
router.post('/login', authRateLimiter, (req, res) => authController.login(req, res));
router.post('/google', authRateLimiter, (req, res) => authController.googleAuth(req, res));
router.post('/logout', (req, res) => authController.logout(req, res));

// Protected Auth Routes
router.get('/me', requireAuth, (req, res) => authController.me(req, res));
router.post('/change-password', requireAuth, authRateLimiter, (req, res) => authController.changePassword(req, res));
router.patch('/preferences', requireAuth, (req, res) => authController.updatePreferences(req, res));
router.patch('/consent', requireAuth, (req, res) => authController.updateConsent(req, res));

export default router;
