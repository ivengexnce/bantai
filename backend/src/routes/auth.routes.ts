import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { authRateLimiter, signupRateLimiter } from '../middleware/rate-limit.middleware';

const router = Router();

// Public auth endpoints with brute-force protection
router.post('/signup', signupRateLimiter, (req, res) => authController.signup(req, res));
router.post('/login', authRateLimiter, (req, res) => authController.login(req, res));
router.post('/mfa/verify', authRateLimiter, (req, res) => authController.mfaVerifyChallenge(req, res));
router.post('/forgot-password', authRateLimiter, (req, res) => authController.forgotPassword(req, res));
router.post('/reset-password', authRateLimiter, (req, res) => authController.resetPassword(req, res));
router.post('/google', authRateLimiter, (req, res) => authController.googleAuth(req, res));
router.post('/logout', (req, res) => authController.logout(req, res));
router.get('/session', (req, res) => authController.session(req, res));

// Protected Auth & MFA Routes
router.get('/me', requireAuth, (req, res) => authController.me(req, res));
router.post('/change-password', requireAuth, authRateLimiter, (req, res) => authController.changePassword(req, res));
router.post('/mfa/setup', requireAuth, authRateLimiter, (req, res) => authController.mfaSetup(req, res));
router.post('/mfa/confirm', requireAuth, authRateLimiter, (req, res) => authController.mfaConfirm(req, res));
router.post('/mfa/disable', requireAuth, authRateLimiter, (req, res) => authController.mfaDisable(req, res));
router.patch('/preferences', requireAuth, (req, res) => authController.updatePreferences(req, res));
router.patch('/consent', requireAuth, (req, res) => authController.updateConsent(req, res));

export default router;
