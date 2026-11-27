import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import { config } from '../../config/env';

export interface OutgoingMailPayload {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface MailDispatchResult {
  delivered: boolean;
  transport: 'smtp' | 'local_outbox';
  messageId: string;
  emlContent: string;
  outboxFile?: string;
}

/**
 * Generates an RFC 5322 compliant `.eml` payload for drafts or sent messages.
 */
export function buildEmlDocument(params: {
  from?: string;
  to: string;
  subject: string;
  body: string;
  messageId?: string;
}): string {
  const cleanFrom = (params.from || config.smtpFrom || 'no-reply@bantai.local').replace(/[\r\n]/g, '');
  const cleanTo = params.to.replace(/[\r\n]/g, '');
  const cleanSubject = params.subject.replace(/[\r\n]/g, '');
  const msgId = params.messageId || `<${crypto.randomUUID()}@bantai.local>`;
  const dateHeader = new Date().toUTCString();

  return [
    `From: ${cleanFrom}`,
    `To: ${cleanTo}`,
    `Subject: ${cleanSubject}`,
    `Date: ${dateHeader}`,
    `Message-ID: ${msgId}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    params.body
  ].join('\r\n');
}

/**
 * Production SMTP & Local Outbox Mailer Service.
 *
 * Uses `nodemailer` over configured SMTP when `SMTP_HOST` is set, and falls
 * back to an append-only local outbox JSONL log (`DATA_DIR/mail_outbox.jsonl`)
 * for local development & automated integration tests without silently dropping mail.
 */
export class MailerService {
  private getOutboxPath(): string {
    const dir = path.resolve(process.env.DATA_DIR || config.dataDir);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
    return path.join(dir, 'mail_outbox.jsonl');
  }

  public isSmtpConfigured(): boolean {
    return Boolean(config.smtpHost);
  }

  public async sendMail(payload: OutgoingMailPayload): Promise<MailDispatchResult> {
    const messageId = `<${crypto.randomUUID()}@bantai.local>`;
    const emlContent = buildEmlDocument({
      from: config.smtpFrom,
      to: payload.to,
      subject: payload.subject,
      body: payload.text,
      messageId
    });

    if (config.smtpHost) {
      const transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        secure: config.smtpSecure,
        ...(config.smtpUser && config.smtpPass
          ? { auth: { user: config.smtpUser, pass: config.smtpPass } }
          : {})
      });

      const info = await transporter.sendMail({
        from: config.smtpFrom,
        to: payload.to,
        subject: payload.subject,
        text: payload.text,
        ...(payload.html ? { html: payload.html } : {}),
        messageId
      });

      return {
        delivered: true,
        transport: 'smtp',
        messageId: info.messageId || messageId,
        emlContent
      };
    }

    const outboxFile = this.getOutboxPath();
    const record = {
      messageId,
      from: config.smtpFrom,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      emlContent,
      queuedAt: new Date().toISOString()
    };
    fs.appendFileSync(outboxFile, JSON.stringify(record) + '\n', { encoding: 'utf8', mode: 0o600 });

    return {
      delivered: true,
      transport: 'local_outbox',
      messageId,
      emlContent,
      outboxFile
    };
  }

  public async sendPasswordResetEmail(email: string, resetToken: string, expiresMinutes = 15): Promise<MailDispatchResult> {
    const subject = 'BANTAI Password Reset Instructions';
    const text = [
      'A password reset was requested for your BANTAI account.',
      '',
      `Single-Use Reset Token: ${resetToken}`,
      `Expires in: ${expiresMinutes} minutes`,
      '',
      'Paste this token into the "Reset Password" form on the Sign In screen to set a new password.',
      'If you did not request this reset, you can safely ignore this message.'
    ].join('\n');

    return this.sendMail({ to: email, subject, text });
  }
}

export const mailerService = new MailerService();
