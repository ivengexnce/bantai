import crypto from 'crypto';
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { mongoUserService } from '../services/database/mongo.service';
import { signToken, signMfaChallengeToken, verifyToken, revokeToken } from '../utils/jwt';
import { AuthenticatedRequest, validateCsrfForCookieRequest } from '../middleware/auth.middleware';
import { config } from '../config/env';
import { sendInternalError } from '../utils/security';
import { SESSION_COOKIE_NAME, clearAuthCookies, parseCookies, setAuthCookies } from '../utils/cookies';
import { mailerService } from '../services/mail/mailer.service';
import { learningService } from '../services/learning/learning.service';
import {
  buildOtpAuthUri,
  generateRecoveryCodes,
  generateTotpSecret,
  hashPasswordResetToken,
  hashSecretToken,
  verifyTotpToken
} from '../utils/totp';
import {
  SignupRequestSchema,
  LoginRequestSchema,
  ChangePasswordSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  MfaVerifyChallengeSchema,
  MfaCodeSchema,
  MfaDisableSchema,
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

      const userId = crypto.randomUUID();
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
        tokenVersion: 0,
        mfaEnabled: false
      };

      const safeProfile = await mongoUserService.createUser(newUser);
      const token = signToken({
        userId: safeProfile.userId,
        email: safeProfile.email,
        role: safeProfile.role,
        tokenVersion: 0
      });
      setAuthCookies(res, token, req);

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
        await bcrypt.compare(password, '$2a$12$invalidhashplaceholderpadding0000000000000000000000000');
        return res.status(401).json({ success: false, error: 'Invalid email or password' });
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid || user.status !== 'active') {
        return res.status(401).json({ success: false, error: 'Invalid email or password' });
      }

      if (user.mfaEnabled && user.mfaSecret) {
        const mfaChallengeToken = signMfaChallengeToken({
          userId: user.userId,
          email: user.email,
          role: user.role,
          tokenVersion: user.tokenVersion ?? 0
        });
        return res.json({
          success: true,
          data: { mfaRequired: true, mfaChallengeToken }
        });
      }

      await mongoUserService.updateLastLogin(user.userId);
      const safeProfile = await mongoUserService.findSafeProfileById(user.userId);
      const token = signToken({
        userId: user.userId,
        email: user.email,
        role: user.role,
        tokenVersion: user.tokenVersion ?? 0
      });
      setAuthCookies(res, token, req);

      return res.json({
        success: true,
        data: { user: safeProfile, token }
      });
    } catch (err) {
      return sendInternalError(res, 'AuthController.login', err);
    }
  }

  async mfaVerifyChallenge(req: Request, res: Response) {
    try {
      const parsed = MfaVerifyChallengeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: parsed.error.issues[0].message });
      }

      let decoded;
      try {
        decoded = verifyToken(parsed.data.challengeToken, 'mfa_challenge');
      } catch {
        return res.status(401).json({ success: false, error: 'Invalid or expired MFA challenge token.' });
      }

      const user = await mongoUserService.findById(decoded.userId);
      if (!user || !user.mfaEnabled || !user.mfaSecret || user.status !== 'active') {
        return res.status(401).json({ success: false, error: 'MFA verification failed.' });
      }
      if ((decoded.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
        return res.status(401).json({ success: false, error: 'MFA challenge invalidated.' });
      }

      const code = parsed.data.code.trim();
      const totpRes = verifyTotpToken(user.mfaSecret, code, user.mfaLastUsedStep);
      let verified = totpRes.valid;

      if (verified && totpRes.matchedStep !== undefined) {
        await mongoUserService.recordTotpStepUsed(user.userId, totpRes.matchedStep);
      } else {
        verified = await mongoUserService.consumeRecoveryCode(user.userId, hashSecretToken(code));
      }

      if (!verified) {
        return res.status(401).json({ success: false, error: 'Invalid or already-used verification code.' });
      }

      await mongoUserService.updateLastLogin(user.userId);
      const safeProfile = await mongoUserService.findSafeProfileById(user.userId);
      const token = signToken({
        userId: user.userId,
        email: user.email,
        role: user.role,
        tokenVersion: user.tokenVersion ?? 0
      });
      setAuthCookies(res, token, req);

      return res.json({
        success: true,
        data: { user: safeProfile, token }
      });
    } catch (err) {
      return sendInternalError(res, 'AuthController.mfaVerifyChallenge', err);
    }
  }

  async mfaSetup(req: AuthenticatedRequest, res: Response) {
    try {
      const user = await mongoUserService.findById(req.user!.userId);
      if (!user) return res.status(404).json({ success: false, error: 'User not found' });

      const secret = generateTotpSecret();
      await mongoUserService.setPendingMfaSecret(user.userId, secret);
      const otpauthUri = buildOtpAuthUri(user.email, secret, 'BANTAI');

      return res.json({
        success: true,
        data: { secret, otpauthUri }
      });
    } catch (err) {
      return sendInternalError(res, 'AuthController.mfaSetup', err);
    }
  }

  async mfaConfirm(req: AuthenticatedRequest, res: Response) {
    try {
      const parsed = MfaCodeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: parsed.error.issues[0].message });
      }

      const user = await mongoUserService.findById(req.user!.userId);
      if (!user || !user.mfaPendingSecret) {
        return res.status(400).json({ success: false, error: 'Initiate MFA setup before confirming.' });
      }

      const check = verifyTotpToken(user.mfaPendingSecret, parsed.data.code);
      if (!check.valid) {
        return res.status(400).json({ success: false, error: 'Invalid 6-digit authenticator code.' });
      }

      const recoveryCodes = generateRecoveryCodes(8);
      const hashes = recoveryCodes.map(c => hashSecretToken(c));
      const updatedUser = await mongoUserService.enableMfa(user.userId, user.mfaPendingSecret, hashes);
      if (check.matchedStep !== undefined) {
        await mongoUserService.recordTotpStepUsed(user.userId, check.matchedStep);
      }

      return res.json({
        success: true,
        data: { user: updatedUser, recoveryCodes }
      });
    } catch (err) {
      return sendInternalError(res, 'AuthController.mfaConfirm', err);
    }
  }

  async mfaDisable(req: AuthenticatedRequest, res: Response) {
    try {
      const parsed = MfaDisableSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: parsed.error.issues[0].message });
      }

      const user = await mongoUserService.findById(req.user!.userId);
      if (!user || !user.passwordHash) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      const pwOk = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
      if (!pwOk) {
        return res.status(401).json({ success: false, error: 'Current password is incorrect' });
      }

      if (user.mfaEnabled && user.mfaSecret) {
        const totpRes = verifyTotpToken(user.mfaSecret, parsed.data.code, user.mfaLastUsedStep);
        let codeOk = totpRes.valid;
        if (!codeOk) {
          codeOk = await mongoUserService.consumeRecoveryCode(user.userId, hashSecretToken(parsed.data.code));
        }
        if (!codeOk) {
          return res.status(401).json({ success: false, error: 'Invalid MFA or recovery code' });
        }
      }

      const updatedUser = await mongoUserService.disableMfa(user.userId);
      const freshToken = signToken({
        userId: user.userId,
        email: user.email,
        role: user.role,
        tokenVersion: user.tokenVersion ?? 0
      });
      setAuthCookies(res, freshToken, req);

      return res.json({
        success: true,
        data: { user: updatedUser, token: freshToken }
      });
    } catch (err) {
      return sendInternalError(res, 'AuthController.mfaDisable', err);
    }
  }

  async createPasswordResetTokenForUser(email: string): Promise<string | null> {
    const user = await mongoUserService.findByEmail(email);
    if (!user || user.status !== 'active') return null;

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashPasswordResetToken(rawToken);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    await mongoUserService.setPasswordResetToken(user.userId, tokenHash, expiresAt);
    return rawToken;
  }

  async forgotPassword(req: Request, res: Response) {
    try {
      const parsed = ForgotPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: parsed.error.issues[0].message });
      }

      // Never return reset tokens in HTTP responses or distinguish existing vs non-existing emails
      const rawToken = await this.createPasswordResetTokenForUser(parsed.data.email);
      if (rawToken) {
        try {
          await mailerService.sendPasswordResetEmail(parsed.data.email.trim().toLowerCase(), rawToken, 15);
        } catch (mailErr) {
          // Log sanitized error without leaking email existence externally
          console.error('[AuthController.forgotPassword] Delivery error:', (mailErr as Error).message);
        }
      }

      return res.json({
        success: true,
        message: 'If an account matches that email, password reset instructions have been sent.'
      });
    } catch (err) {
      return sendInternalError(res, 'AuthController.forgotPassword', err);
    }
  }

  async resetPassword(req: Request, res: Response) {
    try {
      const parsed = ResetPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: parsed.error.issues[0].message });
      }

      const tokenHash = hashPasswordResetToken(parsed.data.token);
      const user = await mongoUserService.findByValidPasswordResetToken(tokenHash);
      if (!user || user.status !== 'active') {
        return res.status(400).json({ success: false, error: 'Invalid or expired password reset token.' });
      }

      const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
      const newHash = await bcrypt.hash(parsed.data.newPassword, salt);
      await mongoUserService.completePasswordReset(user.userId, newHash);

      return res.json({
        success: true,
        message: 'Password has been reset and existing sessions invalidated.'
      });
    } catch (err) {
      return sendInternalError(res, 'AuthController.resetPassword', err);
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
      setAuthCookies(res, newToken, req);

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

      if (!config.enableDevMockOAuth) {
        return res.status(501).json({
          success: false,
          error: 'Google OAuth verification is not configured. Please use email/password login.'
        });
      }

      const mockEmail = `google_dev_${Date.now()}@bantai.local`;
      let user = await mongoUserService.findByEmail(mockEmail);

      if (!user) {
        const userId = crypto.randomUUID();
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
          tokenVersion: 0,
          mfaEnabled: false
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
      setAuthCookies(res, token, req);
      const safe = await mongoUserService.findSafeProfileById(user.userId);

      return res.json({
        success: true,
        data: { user: safe, token }
      });
    } catch (err) {
      return sendInternalError(res, 'AuthController.googleAuth', err);
    }
  }

  private isLoopbackWorkstationRequest(req: Request): boolean {
    if (!config.localWorkstationMode) return false;
    if (req.headers['x-forwarded-for']) return false;
    const remote = (req.socket?.remoteAddress || req.ip || '').trim();
    return remote === '127.0.0.1' || remote === '::1' || remote === '::ffff:127.0.0.1';
  }

  async workstationSession(req: Request, res: Response) {
    try {
      if (!this.isLoopbackWorkstationRequest(req)) {
        return res.status(403).json({
          success: false,
          error: 'Local workstation session is disabled or restricted to direct loopback connections.'
        });
      }

      const workstationEmail = 'workstation@localhost.bantai';
      let user = await mongoUserService.findByEmail(workstationEmail);
      if (!user) {
        const now = new Date().toISOString();
        const created = await mongoUserService.createUser({
          userId: 'local_workstation_owner',
          email: workstationEmail,
          name: 'Local Workstation',
          username: 'local_workstation',
          role: 'user',
          status: 'active',
          preferences: { ...DEFAULT_USER_PREFERENCES },
          learningConsent: { ...DEFAULT_LEARNING_CONSENT },
          subscriptionPlan: 'free',
          createdAt: now,
          updatedAt: now,
          lastLoginAt: now,
          oauthProvider: 'local',
          tokenVersion: 0,
          mfaEnabled: false
        });
        user = await mongoUserService.findById(created.userId);
      } else {
        await mongoUserService.updateLastLogin(user.userId);
      }

      if (!user || user.status !== 'active') {
        return res.status(403).json({ success: false, error: 'Local workstation profile unavailable.' });
      }

      const token = signToken({
        userId: user.userId,
        email: user.email,
        role: user.role,
        tokenVersion: user.tokenVersion ?? 0
      });
      setAuthCookies(res, token, req);
      const safeUser = await mongoUserService.findSafeProfileById(user.userId);

      return res.json({
        success: true,
        data: { user: safeUser, token }
      });
    } catch (err) {
      return sendInternalError(res, 'AuthController.workstationSession', err);
    }
  }

  async session(req: Request, res: Response) {
    const localWorkstationAvailable = this.isLoopbackWorkstationRequest(req);
    try {
      const authHeader = req.headers.authorization;
      const cookies = parseCookies(req);
      let token = '';
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7).trim();
      } else if (cookies[SESSION_COOKIE_NAME]) {
        token = cookies[SESSION_COOKIE_NAME];
      }

      if (!token) {
        return res.json({
          success: true,
          data: { authenticated: false, user: null, localWorkstationAvailable }
        });
      }

      const decoded = verifyToken(token, 'session');
      const fullUser = await mongoUserService.findById(decoded.userId);
      if (!fullUser || fullUser.status !== 'active' || (decoded.tokenVersion ?? 0) !== (fullUser.tokenVersion ?? 0)) {
        return res.json({
          success: true,
          data: { authenticated: false, user: null, localWorkstationAvailable }
        });
      }

      const safeUser = await mongoUserService.findSafeProfileById(decoded.userId);
      return res.json({
        success: true,
        data: { authenticated: Boolean(safeUser), user: safeUser, localWorkstationAvailable }
      });
    } catch {
      return res.json({
        success: true,
        data: { authenticated: false, user: null, localWorkstationAvailable }
      });
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
      if (parsed.data.crossUserTrainingOptIn === false) {
        learningService.purgeUserExamples(req.user!.userId);
      }
      return res.json({ success: true, data: updated });
    } catch (err) {
      return sendInternalError(res, 'AuthController.updateConsent', err);
    }
  }

  async logout(req: Request, res: Response) {
    try {
      const authHeader = req.headers.authorization;
      const cookies = parseCookies(req);
      let token = '';

      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7).trim();
      } else if (cookies[SESSION_COOKIE_NAME]) {
        const csrfError = validateCsrfForCookieRequest(req);
        if (csrfError) {
          return res.status(403).json({ success: false, error: csrfError });
        }
        token = cookies[SESSION_COOKIE_NAME];
      }

      if (token) {
        try {
          const decoded = verifyToken(token, 'session');
          revokeToken(decoded.jti, decoded.exp);
          if (req.body && req.body.allSessions === true) {
            await mongoUserService.incrementTokenVersion(decoded.userId);
          }
        } catch {
          // Ignore invalid/expired tokens during logout
        }
      }
      clearAuthCookies(res, req);
      return res.json({ success: true, message: 'Successfully logged out' });
    } catch (err) {
      return sendInternalError(res, 'AuthController.logout', err);
    }
  }
}

export const authController = new AuthController();
