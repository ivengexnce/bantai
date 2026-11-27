/**
 * BANTAI ADVANCED VOICE SPEECH & RECOGNITION ENGINE
 * 
 * Provides crystal-clear text-to-speech (TTS) and speech-to-text (STT) calibrated for:
 * 1. Indian English / Hindi natural voices when preferred in Balanced mode.
 * 2. Natural human English voices for Developer, Academic, Professional, and Balanced modes.
 * 3. Robust markdown, code, and emoji stripping so punctuation/syntax isn't spoken.
 * 4. Automatic sentence chunking (<160 chars) to bypass Chromium's 15-second speech cutoff bug.
 * 5. Garbage collection protection for active SpeechSynthesisUtterances.
 * 6. Responsive STT with real-time interim results.
 */

import { PersonalityMode } from '@bantai/shared';
import { api } from './api';

// Active utterances set to prevent V8 garbage-collection bugs mid-speech
const activeUtterances = new Set<SpeechSynthesisUtterance>();

// Global keep-alive interval reference for Chromium speech synthesis
let keepAliveTimer: NodeJS.Timeout | null = null;

// Active HTML5 Audio element for ElevenLabs playback
let activeAudioElement: HTMLAudioElement | null = null;

export interface ElevenLabsVoiceOption {
  voice_id: string;
  name: string;
  description: string;
  gender: 'male' | 'female';
}

export const PRESET_ELEVENLABS_VOICES: ElevenLabsVoiceOption[] = [
  { voice_id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', gender: 'male', description: 'Deep, warm, confident conversational American male.' },
  { voice_id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', gender: 'female', description: 'Bright, expressive, friendly, and lively female tone.' },
  { voice_id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', gender: 'female', description: 'Warm, calm, and highly articulate female narrator.' },
  { voice_id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', gender: 'male', description: 'Crisp, energetic, and engaging American male.' },
  { voice_id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', gender: 'male', description: 'Warm, raspy, sophisticated British English male.' },
  { voice_id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', gender: 'male', description: 'Crisp, articulate documentary narrator.' },
  { voice_id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', gender: 'male', description: 'Casual, conversational Australian male.' },
  { voice_id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', gender: 'male', description: 'Young, energetic, and articulate American male.' },
];

/**
 * Strips code blocks, markdown syntax, URLs, and emojis so the voice engine
 * speaks clean, natural human sentences instead of reading syntax characters.
 */
export function cleanTextForSpeech(rawText: string): string {
  if (!rawText) return '';

  let text = rawText;

  // 1. Remove fenced code blocks completely (```lang ... ```)
  text = text.replace(/```[\s\S]*?```/g, ' [code snippet omitted] ');

  // 2. Remove inline code backticks (`...`)
  text = text.replace(/`([^`]+)`/g, '$1');

  // 3. Remove markdown links [title](url) -> title
  text = text.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');

  // 4. Remove bare URLs
  text = text.replace(/https?:\/\/\S+/gi, 'link');

  // 5. Remove headers (#, ##, ###, etc.)
  text = text.replace(/#{1,6}\s+/g, '');

  // 6. Remove bold / italic markers (**text**, *text*, __text__, _text_)
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
  text = text.replace(/\*([^*]+)\*/g, '$1');
  text = text.replace(/__([^_]+)__/g, '$1');
  text = text.replace(/_([^_]+)_/g, '$1');

  // 7. Remove list markers (1. , 2. , - , * , ●)
  text = text.replace(/^\s*(\d+\.|[*\-●])\s+/gm, '');

  // 8. Remove emojis and decorative symbols using unicode property escapes
  try {
    text = text.replace(/[\p{Extended_Pictographic}\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '');
  } catch {
    // Fallback regex for environments without unicode property escape support
    text = text.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '');
  }

  // 9. Format technical acronyms for clear phonetic pronunciation
  text = text.replace(/\bBANTAI\b/gi, 'Bantai');
  text = text.replace(/\bVRAM\b/g, 'V-RAM');
  text = text.replace(/\bRAM\b/g, 'RAM');
  text = text.replace(/\bAPI\b/g, 'A-P-I');
  text = text.replace(/\bAPIs\b/g, 'A-P-Is');
  text = text.replace(/\bUI\b/g, 'U-I');
  text = text.replace(/\bUX\b/g, 'U-X');
  text = text.replace(/\bGPU\b/g, 'G-P-U');
  text = text.replace(/\bCPUs?\b/g, 'C-P-U');
  text = text.replace(/\bNext\.js\b/gi, 'Next J S');
  text = text.replace(/\bNode\.js\b/gi, 'Node J S');

  // 10. Clean up extra punctuation, special characters, and multiple whitespace
  text = text.replace(/[~^|><]/g, ' ');
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

/**
 * Splits text into natural speech chunks (~160 chars maximum)
 * ending on sentence boundaries or commas. This bypasses the Chromium
 * 15-second speech cutoff bug completely.
 */
export function splitIntoSpeechChunks(text: string, maxLen = 160): string[] {
  if (!text) return [];

  // Match sentence boundaries: . ! ? \n or ;
  const sentences = text.match(/[^.!?\n;]+[.!?\n;]+|[^.!?\n;]+$/g) || [text];
  const chunks: string[] = [];
  let currentChunk = '';

  for (const rawSentence of sentences) {
    const sentence = rawSentence.trim();
    if (!sentence) continue;

    if (sentence.length <= maxLen) {
      if ((currentChunk + ' ' + sentence).trim().length <= maxLen) {
        currentChunk = (currentChunk + ' ' + sentence).trim();
      } else {
        if (currentChunk) chunks.push(currentChunk);
        currentChunk = sentence;
      }
    } else {
      // If a single sentence is longer than maxLen, split on commas or spaces
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = '';
      }

      const clauses = sentence.split(/,\s*/);
      for (const clause of clauses) {
        const c = clause.trim();
        if (!c) continue;

        if ((currentChunk + ', ' + c).trim().length <= maxLen) {
          currentChunk = currentChunk ? `${currentChunk}, ${c}` : c;
        } else {
          if (currentChunk) chunks.push(currentChunk);
          currentChunk = c;
        }
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * Asynchronously retrieves available browser speech synthesis voices.
 * Handles the async loading behavior of Chromium.
 */
export function getAvailableVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise(resolve => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve([]);
      return;
    }

    const immediate = window.speechSynthesis.getVoices();
    if (immediate && immediate.length > 0) {
      resolve(immediate);
      return;
    }

    const handler = () => {
      const voices = window.speechSynthesis.getVoices();
      window.speechSynthesis.removeEventListener('voiceschanged', handler);
      resolve(voices);
    };

    window.speechSynthesis.addEventListener('voiceschanged', handler);

    // Safety timeout in case voiceschanged does not fire
    setTimeout(() => {
      window.speechSynthesis.removeEventListener('voiceschanged', handler);
      resolve(window.speechSynthesis.getVoices() || []);
    }, 500);
  });
}

/**
 * Selects the optimal voice depending on personality mode and user preferences.
 * - Balanced mode considers natural Indian English (en-IN) / Hindi alongside high-fidelity English voices.
 * - Developer / Academic / Professional modes prioritize high-fidelity natural English voices.
 */
export function pickBestVoice(
  voices: SpeechSynthesisVoice[],
  mode: PersonalityMode = 'balanced',
  preferredGender: 'male' | 'female' = 'male',
  preferredVoiceURI?: string
): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  // 1. User explicit voice preference by URI
  if (preferredVoiceURI) {
    const matched = voices.find(v => v.voiceURI === preferredVoiceURI);
    if (matched) return matched;
  }

  const preferIndicFriendly = mode === 'balanced';

  if (preferIndicFriendly) {
    const indianVoices = voices.filter(v =>
      v.lang.toLowerCase().startsWith('en-in') ||
      v.lang.toLowerCase().startsWith('hi') ||
      /india|hindi|ravi|heera|neerja|swara|madhur|veena|rishi/i.test(v.name)
    );

    if (indianVoices.length > 0) {
      if (preferredGender === 'male') {
        const maleIndian = indianVoices.find(v =>
          /male|ravi|madhur|rishi/i.test(v.name) && !/female|heera|neerja|swara|veena/i.test(v.name)
        );
        if (maleIndian) return maleIndian;
      } else {
        const femaleIndian = indianVoices.find(v =>
          /female|heera|neerja|swara|veena/i.test(v.name)
        );
        if (femaleIndian) return femaleIndian;
      }
      return indianVoices[0];
    }
  }

  // 3. High quality natural English voices for Developer, Academic, and Balanced modes
  // Prioritize Microsoft Natural / Online voices, Google Natural, Samantha, Alex
  const naturalVoices = voices.filter(v =>
    v.lang.toLowerCase().startsWith('en') &&
    (/natural|online|google|premium|enhanced|aria|jenny|guy|samantha|daniel/i.test(v.name) ||
     v.name.includes('(Natural)'))
  );

  if (naturalVoices.length > 0) {
    if (preferredGender === 'male') {
      const maleVoice = naturalVoices.find(v => /male|guy|daniel|alex/i.test(v.name) && !/female|jenny|aria|samantha/i.test(v.name));
      if (maleVoice) return maleVoice;
    } else {
      const femaleVoice = naturalVoices.find(v => /female|jenny|aria|samantha/i.test(v.name));
      if (femaleVoice) return femaleVoice;
    }
    return naturalVoices[0];
  }

  // 4. Any English voice matching gender
  const englishVoices = voices.filter(v => v.lang.toLowerCase().startsWith('en'));
  if (englishVoices.length > 0) {
    return englishVoices[0];
  }

  // 5. Default fallback
  const defaultVoice = voices.find(v => v.default);
  return defaultVoice || voices[0] || null;
}

export interface SpeakOptions {
  mode?: PersonalityMode;
  rate?: number; // 0.8 - 1.25, default 1.05
  pitch?: number; // default 1.0
  gender?: 'male' | 'female';
  voiceURI?: string;
  provider?: 'browser' | 'elevenlabs';
  elevenVoiceId?: string;
  elevenModelId?: string;
  elevenApiKey?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
  onChunk?: (chunkIndex: number, totalChunks: number) => void;
}

/**
 * Speaks using browser Web Speech synthesis with sentence chunking
 */
function speakWithBrowser(
  clean: string,
  options: SpeakOptions = {}
): { stop: () => void } {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('SpeechSynthesis is not supported in this environment.');
    options.onError?.(new Error('SpeechSynthesis unsupported'));
    return { stop: () => {} };
  }

  const chunks = splitIntoSpeechChunks(clean);
  if (chunks.length === 0) {
    options.onEnd?.();
    return { stop: () => {} };
  }

  let isStopped = false;
  let currentIndex = 0;

  // Start keep-alive interval for Chrome (pauses and resumes every 9s to prevent freeze)
  if (keepAliveTimer) clearInterval(keepAliveTimer);
  keepAliveTimer = setInterval(() => {
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    }
  }, 9000);

  const stop = () => {
    isStopped = true;
    if (keepAliveTimer) {
      clearInterval(keepAliveTimer);
      keepAliveTimer = null;
    }
    window.speechSynthesis.cancel();
    activeUtterances.clear();
    options.onEnd?.();
  };

  getAvailableVoices().then(voices => {
    if (isStopped) return;

    const chosenVoice = pickBestVoice(
      voices,
      options.mode || 'balanced',
      options.gender || 'male',
      options.voiceURI
    );

    options.onStart?.();

    const speakNextChunk = () => {
      if (isStopped || currentIndex >= chunks.length) {
        if (keepAliveTimer) {
          clearInterval(keepAliveTimer);
          keepAliveTimer = null;
        }
        activeUtterances.clear();
        options.onEnd?.();
        return;
      }

      const chunkText = chunks[currentIndex];
      options.onChunk?.(currentIndex, chunks.length);

      const utterance = new SpeechSynthesisUtterance(chunkText);
      activeUtterances.add(utterance);

      if (chosenVoice) {
        utterance.voice = chosenVoice;
        utterance.lang = chosenVoice.lang;
      }

      utterance.rate = options.rate || 1.0;
      utterance.pitch = options.pitch || 1.0;

      utterance.onend = () => {
        activeUtterances.delete(utterance);
        currentIndex++;
        speakNextChunk();
      };

      utterance.onerror = (e) => {
        activeUtterances.delete(utterance);
        if (e.error === 'canceled' || e.error === 'interrupted') {
          return;
        }
        console.warn('Speech chunk error:', e);
        currentIndex++;
        speakNextChunk();
      };

      try {
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.error('Window speech error:', err);
        options.onError?.(err);
      }
    };

    speakNextChunk();
  });

  return { stop };
}

/**
 * Speaks the given text cleanly with sentence chunking, Chromium keep-alive,
 * and garbage collection protection.
 * Supports both ElevenLabs Neural Voice and native Web Speech.
 */
export function speakText(
  text: string,
  options: SpeakOptions = {}
): { stop: () => void } {
  // Cancel any running speech
  stopSpeaking();

  const clean = cleanTextForSpeech(text);
  if (!clean) {
    options.onEnd?.();
    return { stop: () => {} };
  }

  const elevenApiKey = options.elevenApiKey || undefined;

  // Determine provider: ElevenLabs or native browser (keys remain strictly server-side unless explicit session override)
  const storedProvider = typeof window !== 'undefined' ? localStorage.getItem('bantai_voice_provider') : null;
  const provider = options.provider ||
    storedProvider ||
    (elevenApiKey ? 'elevenlabs' : 'browser');

  const elevenVoiceId = options.elevenVoiceId ||
    (typeof window !== 'undefined' ? localStorage.getItem('bantai_elevenlabs_voice_id') : null) ||
    'pNInz6obpgDQGcFmaJgB'; // Adam default (verified 200 OK)

  const elevenModelId = options.elevenModelId ||
    (typeof window !== 'undefined' ? localStorage.getItem('bantai_elevenlabs_model_id') : null) ||
    'eleven_multilingual_v2';

  // 1. If ElevenLabs is requested, try ElevenLabs first with automatic graceful fallback
  if (provider === 'elevenlabs') {
    let currentAudio: HTMLAudioElement | null = null;
    let isCancelled = false;

    const stopEleven = () => {
      isCancelled = true;
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
      }
      activeAudioElement = null;
      options.onEnd?.();
    };

    api.synthesizeElevenLabs(clean, elevenVoiceId, elevenModelId, elevenApiKey)
      .then(audioUrl => {
        if (isCancelled) return;
        const audio = new Audio(audioUrl);
        currentAudio = audio;
        activeAudioElement = audio;

        audio.onplay = () => {
          options.onStart?.();
        };

        audio.onended = () => {
          currentAudio = null;
          activeAudioElement = null;
          options.onEnd?.();
        };

        audio.onerror = (e) => {
          console.warn('[ElevenLabs] Audio playback error, falling back to local speech:', e);
          if (!isCancelled) {
            speakWithBrowser(clean, options);
          }
        };

        audio.play().catch(err => {
          console.warn('[ElevenLabs] Play caught:', err);
          if (!isCancelled) {
            speakWithBrowser(clean, options);
          }
        });
      })
      .catch(err => {
        console.warn('[ElevenLabs] Synthesis error, falling back to local speech:', err);
        if (!isCancelled) {
          // Graceful fallback to browser voice
          speakWithBrowser(clean, options);
        }
      });

    return { stop: stopEleven };
  }

  // 2. Default: Browser Web Speech
  return speakWithBrowser(clean, options);
}

/**
 * Stops any current speech synthesis cleanly (both ElevenLabs audio and Web Speech).
 */
export function stopSpeaking() {
  if (activeAudioElement) {
    try {
      activeAudioElement.pause();
      activeAudioElement.currentTime = 0;
    } catch {}
    activeAudioElement = null;
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }

  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }
  activeUtterances.clear();
}

/**
 * Creates an enhanced SpeechRecognizer instance for voice input.
 * Switches locale between en-IN (Balanced) and en-US (Technical/Formal modes).
 */
export function createSpeechRecognizer(options: {
  mode?: PersonalityMode;
  onInterimResult?: (text: string) => void;
  onFinalResult: (text: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: string) => void;
}) {
  if (typeof window === 'undefined') return null;

  const SpeechRecognitionClass =
    (window as unknown as { SpeechRecognition?: new () => any }).SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: new () => any }).webkitSpeechRecognition;

  if (!SpeechRecognitionClass) {
    options.onError?.('Speech recognition is not supported in this browser.');
    return null;
  }

  try {
    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;

    // Use Indian English locale for Balanced bilingual mode, US English for technical/formal modes
    recognition.lang = !options.mode || options.mode === 'balanced' ? 'en-IN' : 'en-US';

    recognition.onstart = () => {
      options.onStart?.();
    };

    recognition.onend = () => {
      options.onEnd?.();
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return;
      }
      options.onError?.(event.error || 'Speech recognition error');
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      if (final) {
        options.onFinalResult(final);
      } else if (interim && options.onInterimResult) {
        options.onInterimResult(interim);
      }
    };

    return recognition;
  } catch (err) {
    console.error('Failed to instantiate speech recognizer:', err);
    options.onError?.((err as Error).message);
    return null;
  }
}
