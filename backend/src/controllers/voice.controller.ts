import { Request, Response } from 'express';
import { SynthesizeVoiceSchema } from '@bantai/shared';
import { elevenLabsService } from '../services/ai/elevenlabs.service';
import { sanitizeForLog, sendInternalError } from '../utils/security';

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

export async function synthesizeVoiceHandler(req: Request, res: Response) {
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
      ? req.headers['x-elevenlabs-key']
      : undefined;

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
      'Cache-Control': 'no-store'
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
