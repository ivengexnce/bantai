import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { mongoUserService } from '../services/database/mongo.service';
import { signToken, verifyToken, revokeToken } from '../utils/jwt';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { config } from '../config/env';
import { sendInternalError } from '../utils/security';
import {
  SignupRequestSchema,
  LoginRequestSchema,
  ChangePasswordSchema,
  GoogleAuthRequestSchema,
  UpdatePreferencesSchema,
  UpdateConsentSchema,
  DEFAULT_USER_PREFERENCES,
  DEFAULT_LEARNING_CONSENT,
  MongoUser
} from '@bantai/shared';

const BCRYPT_ROUNDS = 12;

export class AuthController {
  async signup(req: Request, res: Response) {
    try {
      const parsed = SignupRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: parsed.error.issues[0].message });
      }

      const { email, password, name, username } = parsed.data;

      const existingEmail = await mongoUserService.findByEmail(email);
      if (existingEmail) {
        return res.status(409).json({ success: false, error: 'Unable to complete registration with provided credentials' });
      }

      const existingUsername = await mongoUserService.findByUsername(username);
      if (existingUsername) {
        return res.status(409).json({ success: false, error: 'Username is already unavailable' });
      }

      const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
      const passwordHash = await bcrypt.hash(password, salt);

      const userId = uuidv4();
      const now = new Date().toISOString();

      const newUser: MongoUser = {
        userId,
        email: email.toLowerCase(),
        name,
        username: username.toLowerCase(),
        passwordHash,
        role: 'user',
        status: 'active',
        preferences: { ...DEFAULT_USER_PREFERENCES },
        learningConsent: { ...DEFAULT_LEARNING_CONSENT },
        subscriptionPlan: 'free',
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
        oauthProvider: 'local',
        tokenVersion: 0
      };

      const safeProfile = await mongoUserService.createUser(newUser);
      const token = signToken({
        userId: safeProfile.userId,
        email: safeProfile.email,
        role: safeProfile.role,
        tokenVersion: 0
      });

      return res.status(201).json({
        success: true,
        data: { user: safeProfile, token }
      });
    } catch (err) {
      return sendInternalError(res, 'AuthController.signup', err);
    }
  }

  async login(req: Request, res: Response) {
    try {
      const parsed = LoginRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: parsed.error.issues[0].message });
      }

      const { email, password } = parsed.data;
      const user = await mongoUserService.findByEmail(email);

      if (!user || !user.passwordHash) {
        // Constant-time mitigation against user enumeration
        await bcrypt.compare(password, '$2a$12$invalidhashplaceholderpadding0000000000000000000000000');
        return res.status(401).json({ success: false, error: 'Invalid email or password' });
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid || user.status !== 'active') {
        return res.status(401).json({ success: false, error: 'Invalid email or password' });
      }

      await mongoUserService.updateLastLogin(user.userId);
      const safeProfile = await mongoUserService.findSafeProfileById(user.userId);
      const token = signToken({
        userId: user.userId,
        email: user.email,
        role: user.role,
        tokenVersion: user.tokenVersion ?? 0
      });

      return res.json({
        success: true,
        data: { user: safeProfile, token }
      });
    } catch (err) {
      return sendInternalError(res, 'AuthController.login', err);
    }
  }

  async changePassword(req: AuthenticatedRequest, res: Response) {
    try {
      const parsed = ChangePasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: parsed.error.issues[0].message });
      }

      const user = await mongoUserService.findById(req.user!.userId);
      if (!user || !user.passwordHash) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      const validCurrent = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
      if (!validCurrent) {
        return res.status(401).json({ success: false, error: 'Current password is incorrect' });
      }

      const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
      const newHash = await bcrypt.hash(parsed.data.newPassword, salt);
      const newTokenVersion = await mongoUserService.updatePasswordHash(user.userId, newHash);

      const newToken = signToken({
        userId: user.userId,
        email: user.email,
        role: user.role,
        tokenVersion: newTokenVersion
      });

      return res.json({
        success: true,
        message: 'Password updated and previous sessions invalidated.',
        data: { token: newToken }
      });
    } catch (err) {
      return sendInternalError(res, 'AuthController.changePassword', err);
    }
  }

  async googleAuth(req: Request, res: Response) {
    try {
      const parsed = GoogleAuthRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: parsed.error.issues[0].message });
      }

      // Mock OAuth is strictly forbidden unless explicit local dev simulation flag is opted in
      if (!config.enableDevMockOAuth) {
        return res.status(501).json({
          success: false,
          error: 'Google OAuth verification is not configured. Please use email/password login.'
        });
      }

      const mockEmail = `google_dev_${Date.now()}@bantai.local`;
      let user = await mongoUserService.findByEmail(mockEmail);

      if (!user) {
        const userId = uuidv4();
        const now = new Date().toISOString();
        const newUser: MongoUser = {
          userId,
          email: mockEmail,
          name: 'Google User (Dev)',
          username: `guser_${Math.random().toString(36).substring(2, 8)}`,
          role: 'user',
          status: 'active',
          preferences: { ...DEFAULT_USER_PREFERENCES },
          learningConsent: { ...DEFAULT_LEARNING_CONSENT },
          subscriptionPlan: 'free',
          createdAt: now,
          updatedAt: now,
          lastLoginAt: now,
          oauthProvider: 'google',
          oauthId: parsed.data.idToken.substring(0, 20),
          tokenVersion: 0
        };
        await mongoUserService.createUser(newUser);
        user = newUser;
      }

      const token = signToken({
        userId: user.userId,
        email: user.email,
        role: user.role,
        tokenVersion: user.tokenVersion ?? 0
      });
      const safe = await mongoUserService.findSafeProfileById(user.userId);

      return res.json({
        success: true,
        data: { user: safe, token }
      });
    } catch (err) {
      return sendInternalError(res, 'AuthController.googleAuth', err);
    }
  }

  async me(req: AuthenticatedRequest, res: Response) {
    try {
      const user = await mongoUserService.findSafeProfileById(req.user!.userId);
      if (!user) return res.status(404).json({ success: false, error: 'User not found' });
      return res.json({ success: true, data: user });
    } catch (err) {
      return sendInternalError(res, 'AuthController.me', err);
    }
  }

  async updatePreferences(req: AuthenticatedRequest, res: Response) {
    try {
      const parsed = UpdatePreferencesSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: parsed.error.issues[0].message });
      }

      const updated = await mongoUserService.updatePreferences(req.user!.userId, parsed.data);
      return res.json({ success: true, data: updated });
    } catch (err) {
      return sendInternalError(res, 'AuthController.updatePreferences', err);
    }
  }

  async updateConsent(req: AuthenticatedRequest, res: Response) {
    try {
      const parsed = UpdateConsentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: parsed.error.issues[0].message });
      }

      const updated = await mongoUserService.updateLearningConsent(req.user!.userId, parsed.data);
      return res.json({ success: true, data: updated });
    } catch (err) {
      return sendInternalError(res, 'AuthController.updateConsent', err);
    }
  }

  async logout(req: Request, res: Response) {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7).trim();
        try {
          const decoded = verifyToken(token);
          revokeToken(decoded.jti, decoded.exp);
          if (req.body && req.body.allSessions === true) {
            await mongoUserService.incrementTokenVersion(decoded.userId);
          }
        } catch {
          // Ignore invalid/expired tokens during logout
        }
      }
      return res.json({ success: true, message: 'Successfully logged out' });
    } catch (err) {
      return sendInternalError(res, 'AuthController.logout', err);
    }
  }
}

export const authController = new AuthController();
