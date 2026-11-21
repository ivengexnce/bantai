import { Router } from 'express';
import { getVoicesHandler, synthesizeVoiceHandler } from '../controllers/voice.controller';

const router = Router();

// Retrieve available ElevenLabs voices (or standard catalog)
router.get('/elevenlabs/voices', getVoicesHandler);

// Synthesize text-to-speech with ElevenLabs
router.post('/elevenlabs/tts', synthesizeVoiceHandler);

export default router;
