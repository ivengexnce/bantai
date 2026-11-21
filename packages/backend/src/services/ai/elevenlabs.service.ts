import { config } from '../../config/env';

export interface ElevenLabsVoiceDescriptor {
  voice_id: string;
  name: string;
  category?: string;
  labels?: Record<string, string>;
  preview_url?: string;
  description?: string;
}

export const POPULAR_ELEVENLABS_VOICES: ElevenLabsVoiceDescriptor[] = [
  {
    voice_id: 'pNInz6obpgDQGcFmaJgB',
    name: 'Adam',
    category: 'premade',
    labels: { accent: 'american', gender: 'male', age: 'middle_aged', use_case: 'conversational' },
    description: 'Deep, warm, confident, and natural conversational American male.'
  },
  {
    voice_id: '21m00Tcm4TlvDq8ikWAM',
    name: 'Rachel',
    category: 'premade',
    labels: { accent: 'american', gender: 'female', age: 'young', use_case: 'narration' },
    description: 'Calm, clear, and highly articulate American female.'
  },
  {
    voice_id: 'ErXwobaYiN019PkySvjV',
    name: 'Antoni',
    category: 'premade',
    labels: { accent: 'american', gender: 'male', age: 'young', use_case: 'narration' },
    description: 'Well-rounded, energetic, and engaging American male.'
  },
  {
    voice_id: 'EXAVITQu4vr4xnSDxMaL',
    name: 'Bella',
    category: 'premade',
    labels: { accent: 'american', gender: 'female', age: 'young', use_case: 'conversational' },
    description: 'Bright, expressive, friendly, and lively female tone.'
  },
  {
    voice_id: 'JBFqnCBsd6RMkjVDRZzb',
    name: 'George',
    category: 'premade',
    labels: { accent: 'british', gender: 'male', age: 'middle_aged', use_case: 'narration' },
    description: 'Warm, raspy, sophisticated British English male.'
  },
  {
    voice_id: 'AZnzlk1XvdvUeBnXmlld',
    name: 'Domi',
    category: 'premade',
    labels: { accent: 'american', gender: 'female', age: 'young', use_case: 'conversational' },
    description: 'Strong, authentic, and charismatic female tone.'
  },
  {
    voice_id: 'VR6AewLTigWG4xSOukaG',
    name: 'Arnold',
    category: 'premade',
    labels: { accent: 'american', gender: 'male', age: 'middle_aged', use_case: 'narration' },
    description: 'Crisp, articulate, authoritative documentary narrator.'
  }
];

class ElevenLabsService {
  /**
   * Resolves the API key from caller param, header, or backend config
   */
  private resolveApiKey(explicitKey?: string): string {
    const key = (explicitKey || config.elevenlabsApiKey || process.env.ELEVENLABS_API_KEY || '').trim();
    return key;
  }

  /**
   * Fetches available voices from ElevenLabs API or falls back to popular catalog
   */
  async getVoices(explicitKey?: string): Promise<{
    voices: ElevenLabsVoiceDescriptor[];
    source: 'elevenlabs_api' | 'catalog';
  }> {
    const apiKey = this.resolveApiKey(explicitKey);

    if (!apiKey) {
      return {
        voices: POPULAR_ELEVENLABS_VOICES,
        source: 'catalog'
      };
    }

    try {
      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: {
          'xi-api-key': apiKey,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        console.warn(`[ElevenLabsService] Voices lookup returned status ${response.status}. Using default catalog.`);
        return {
          voices: POPULAR_ELEVENLABS_VOICES,
          source: 'catalog'
        };
      }

      const data = await response.json() as { voices: any[] };
      const formatted: ElevenLabsVoiceDescriptor[] = data.voices.map(v => ({
        voice_id: v.voice_id,
        name: v.name,
        category: v.category,
        labels: v.labels,
        preview_url: v.preview_url,
        description: v.description || (v.labels ? Object.values(v.labels).join(', ') : undefined)
      }));

      return {
        voices: formatted,
        source: 'elevenlabs_api'
      };
    } catch (err) {
      console.warn('[ElevenLabsService] Network error fetching voices:', err);
      return {
        voices: POPULAR_ELEVENLABS_VOICES,
        source: 'catalog'
      };
    }
  }

  /**
   * Synthesizes audio using ElevenLabs text-to-speech API
   */
  async synthesize(
    text: string,
    voiceId: string = 'pNInz6obpgDQGcFmaJgB', // Default: Adam
    modelId: string = 'eleven_multilingual_v2',
    explicitKey?: string,
    voiceSettings?: {
      stability?: number;
      similarity_boost?: number;
      style?: number;
      use_speaker_boost?: boolean;
    }
  ): Promise<ArrayBuffer> {
    const apiKey = this.resolveApiKey(explicitKey);

    if (!apiKey) {
      throw new Error(
        'ElevenLabs API key is missing. Please provide your ElevenLabs API key in Settings or set ELEVENLABS_API_KEY in your environment.'
      );
    }

    const payload = {
      text,
      model_id: modelId || 'eleven_multilingual_v2',
      voice_settings: {
        stability: voiceSettings?.stability ?? 0.5,
        similarity_boost: voiceSettings?.similarity_boost ?? 0.75,
        style: voiceSettings?.style ?? 0.0,
        use_speaker_boost: voiceSettings?.use_speaker_boost ?? true
      }
    };

    const targetVoice = voiceId || 'pNInz6obpgDQGcFmaJgB';
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${targetVoice}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      let parsedMessage = errText;
      try {
        const parsed = JSON.parse(errText);
        parsedMessage = parsed.detail?.message || parsed.message || errText;
      } catch {}

      throw new Error(`ElevenLabs API error (${response.status}): ${parsedMessage}`);
    }

    return await response.arrayBuffer();
  }
}

export const elevenLabsService = new ElevenLabsService();
