import { Request, Response } from 'express';
import { SynthesizeVoiceSchema } from '@bantai/shared';
import { elevenLabsService } from '../services/ai/elevenlabs.service';
import { sanitizeForLog, sendInternalError } from '../utils/security';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { config } from '../config/env';
import { stateStore } from '../services/state/state_store.service';

export async function getVoicesHandler(req: Request, res: Response) {
  try {
    // Reject API keys in URL query parameters to prevent credential logging; header BYOK only
    const explicitKey = typeof req.headers['x-elevenlabs-key'] === 'string'
      ? req.headers['x-elevenlabs-key']
      : undefined;
    const result = await elevenLabsService.getVoices(explicitKey);
    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    return sendInternalError(res, 'VoiceController.getVoices', err);
  }
}

export async function synthesizeVoiceHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const parsed = SynthesizeVoiceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.issues[0].message
      });
    }

    const { text, voiceId, modelId, voiceSettings } = parsed.data;
    const explicitKey = typeof req.headers['x-elevenlabs-key'] === 'string'
      ? req.headers['x-elevenlabs-key'].trim()
      : undefined;

    let charsRemaining: number | undefined;
    // Enforce per-user daily character quota whenever using server-hosted ElevenLabs key
    if (!explicitKey) {
      const userId = req.user?.userId || 'anonymous';
      const todayKey = new Date().toISOString().slice(0, 10);
      const quotaKey = `voice_quota:${userId}:${todayKey}`;
      const limit = config.elevenlabsMaxCharsPerUserDay;
      const usedBefore = Number((await stateStore.get<number>(quotaKey)) ?? 0);

      if (limit <= 0 || usedBefore + text.length > limit) {
        return res.status(429).json({
          success: false,
          error: `Daily ElevenLabs voice character limit (${limit} chars/day) reached. Switch to free browser speech or supply a custom x-elevenlabs-key header.`
        });
      }

      const usedAfter = await stateStore.incrByWithTtl(quotaKey, text.length, 24 * 3600);
      charsRemaining = Math.max(0, limit - usedAfter);
    }

    const audioBuffer = await elevenLabsService.synthesize(
      text,
      voiceId,
      modelId,
      explicitKey,
      voiceSettings
    );

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': String(audioBuffer.byteLength),
      'Cache-Control': 'no-store',
      ...(charsRemaining !== undefined ? { 'X-Voice-Chars-Remaining': String(charsRemaining) } : {})
    });

    res.send(Buffer.from(audioBuffer));
  } catch (err) {
    console.error('[VoiceController] Synthesis error:', sanitizeForLog(err));
    const message = err instanceof Error && /ElevenLabs API key is missing|Invalid ElevenLabs/.test(err.message)
      ? err.message
      : 'Failed to synthesize speech with ElevenLabs.';
    res.status(400).json({
      success: false,
      error: message
    });
  }
}
