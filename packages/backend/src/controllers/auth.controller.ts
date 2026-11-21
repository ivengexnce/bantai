import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { mongoUserService } from '../services/database/mongo.service';
import { signToken } from '../utils/jwt';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import {
  SignupRequestSchema,
  LoginRequestSchema,
  GoogleAuthRequestSchema,
  UpdatePreferencesSchema,
  UpdateConsentSchema,
  DEFAULT_USER_PREFERENCES,
  DEFAULT_LEARNING_CONSENT,
  MongoUser
} from '@bantai/shared';

export class AuthController {
  async signup(req: Request, res: Response) {
    try {
      const parsed = SignupRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: parsed.error.issues[0].message });
      }

      const { email, password, name, username } = parsed.data;

      const existing = await mongoUserService.findByEmail(email);
      if (existing) {
        return res.status(409).json({ success: false, error: 'User with this email already exists' });
      }

      const salt = await bcrypt.genSalt(10);
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
        oauthProvider: 'local'
      };

      const safeProfile = await mongoUserService.createUser(newUser);
      const token = signToken({ userId: safeProfile.userId, email: safeProfile.email, role: safeProfile.role });

      return res.status(201).json({
        success: true,
        data: { user: safeProfile, token }
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: (err as Error).message });
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
        return res.status(401).json({ success: false, error: 'Invalid email or password' });
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ success: false, error: 'Invalid email or password' });
      }

      await mongoUserService.updateLastLogin(user.userId);
      const safeProfile = await mongoUserService.findSafeProfileById(user.userId);
      const token = signToken({ userId: user.userId, email: user.email, role: user.role });

      return res.json({
        success: true,
        data: { user: safeProfile, token }
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: (err as Error).message });
    }
  }

  async googleAuth(req: Request, res: Response) {
    try {
      const parsed = GoogleAuthRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: parsed.error.issues[0].message });
      }

      // Simulated verified Google OAuth token payload for local/development
      // In production with credentials, verify with google-auth-library
      const mockEmail = `user_${Date.now()}@gmail.com`;
      let user = await mongoUserService.findByEmail(mockEmail);

      if (!user) {
        const userId = uuidv4();
        const now = new Date().toISOString();
        const newUser: MongoUser = {
          userId,
          email: mockEmail,
          name: 'Google User',
          username: `guser_${Math.random().toString(36).substring(2, 6)}`,
          role: 'user',
          status: 'active',
          preferences: { ...DEFAULT_USER_PREFERENCES },
          learningConsent: { ...DEFAULT_LEARNING_CONSENT },
          subscriptionPlan: 'free',
          createdAt: now,
          updatedAt: now,
          lastLoginAt: now,
          oauthProvider: 'google',
          oauthId: parsed.data.idToken.substring(0, 20)
        };
        const safeProfile = await mongoUserService.createUser(newUser);
        user = newUser;
      }

      const token = signToken({ userId: user.userId, email: user.email, role: user.role });
      const safe = await mongoUserService.findSafeProfileById(user.userId);

      return res.json({
        success: true,
        data: { user: safe, token }
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: (err as Error).message });
    }
  }

  async me(req: AuthenticatedRequest, res: Response) {
    try {
      const user = await mongoUserService.findSafeProfileById(req.user!.userId);
      if (!user) return res.status(404).json({ success: false, error: 'User not found' });
      return res.json({ success: true, data: user });
    } catch (err) {
      return res.status(500).json({ success: false, error: (err as Error).message });
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
      return res.status(500).json({ success: false, error: (err as Error).message });
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
      return res.status(500).json({ success: false, error: (err as Error).message });
    }
  }

  async logout(_req: Request, res: Response) {
    return res.json({ success: true, message: 'Successfully logged out' });
  }
}

export const authController = new AuthController();
