import { Router } from 'express';
import { getVoicesHandler, synthesizeVoiceHandler } from '../controllers/voice.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { voiceRateLimiter } from '../middleware/rate-limit.middleware';

const router = Router();

// Retrieve available ElevenLabs voices — auth required to prevent unauthenticated API key probing
router.get('/elevenlabs/voices', requireAuth, getVoicesHandler);

// Synthesize text-to-speech — auth + rate limited to prevent API key abuse
router.post('/elevenlabs/tts', requireAuth, voiceRateLimiter, synthesizeVoiceHandler);

export default router;
