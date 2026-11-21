import { Request, Response } from 'express';
import { elevenLabsService } from '../services/ai/elevenlabs.service';

export async function getVoicesHandler(req: Request, res: Response) {
  try {
    const explicitKey = (req.headers['x-elevenlabs-key'] as string) || (req.query.apiKey as string);
    const result = await elevenLabsService.getVoices(explicitKey);
    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: (err as Error).message
    });
  }
}

export async function synthesizeVoiceHandler(req: Request, res: Response) {
  try {
    const { text, voiceId, modelId, voiceSettings, apiKey: bodyKey } = req.body;
    const explicitKey = (req.headers['x-elevenlabs-key'] as string) || bodyKey;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Text to synthesize is required.'
      });
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
      'Content-Length': audioBuffer.byteLength,
      'Cache-Control': 'no-cache'
    });

    res.send(Buffer.from(audioBuffer));
  } catch (err) {
    console.error('[VoiceController] Synthesis error:', err);
    res.status(400).json({
      success: false,
      error: (err as Error).message || 'Failed to synthesize speech with ElevenLabs.'
    });
  }
}
