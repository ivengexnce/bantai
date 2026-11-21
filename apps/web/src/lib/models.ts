export interface ModelInfo {
  id: string;
  name: string;
  shortName: string;
  displayName: string;
  baseModel: string;
  parameters: string;
  tagline: string;
  description: string;
  ramRequirement: string;
  vramRequirement: string;
  hardware?: string;
  speedRating?: number;
  speedLabel?: string;
  powerRating?: number;
  powerLabel?: string;
  isDefault?: boolean;
  switchMessage: string;
}

export const APP_MODELS: ModelInfo[] = [
  {
    id: 'chhotu',
    name: 'BANTAI Chhotu',
    shortName: 'Chhotu',
    displayName: 'BANTAI Chhotu (3B)',
    baseModel: 'qwen2.5:3b',
    parameters: '3B',
    tagline: 'Chhota packet, bada kaam.',
    description: 'Ultra-fast edge inference, low memory footprint. Runs on basic CPU.',
    ramRequirement: '4 GB',
    vramRequirement: 'None',
    hardware: 'CPU only',
    speedRating: 12,
    speedLabel: 'Ultra',
    powerRating: 6,
    powerLabel: 'Edge',
    isDefault: false,
    switchMessage: 'Active model switched to BANTAI Chhotu (3B). Low latency mode ready.'
  },
  {
    id: 'bhai',
    name: 'BANTAI Bhai',
    shortName: 'Bhai',
    displayName: 'BANTAI Bhai (7B - Default)',
    baseModel: 'qwen2.5:7b',
    parameters: '7B',
    tagline: 'All-rounder Mumbai bhai.',
    description: 'Daily sovereign driver. Excellent coding, reasoning, and Hinglish dialogue.',
    ramRequirement: '8 GB',
    vramRequirement: '6 GB',
    hardware: 'Consumer GPU / CPU',
    speedRating: 9,
    speedLabel: 'Fast',
    powerRating: 9,
    powerLabel: 'Balanced',
    isDefault: true,
    switchMessage: 'Active model switched to BANTAI Bhai (7B). General intelligence ready.'
  },
  {
    id: 'ustad',
    name: 'BANTAI Ustad',
    shortName: 'Ustad',
    displayName: 'BANTAI Ustad (14B)',
    baseModel: 'qwen2.5:14b',
    parameters: '14B',
    tagline: 'Master of deep reasoning.',
    description: 'Advanced architecture reviews, full-stack debugging, multi-file refactoring.',
    ramRequirement: '16 GB',
    vramRequirement: '10 GB',
    hardware: 'Dedicated GPU',
    speedRating: 6,
    speedLabel: 'Steady',
    powerRating: 11,
    powerLabel: 'Deep',
    isDefault: false,
    switchMessage: 'Active model switched to BANTAI Ustad (14B). Deep reasoning mode ready.'
  },
  {
    id: 'don',
    name: 'BANTAI Don',
    shortName: 'Don',
    displayName: 'BANTAI Don (32B)',
    baseModel: 'qwen2.5:32b',
    parameters: '32B',
    tagline: 'Hukum ka ikka — Maximum sovereign IQ.',
    description: 'Heavyweight intelligence for formal proofs, mathematical modeling, and enterprise research.',
    ramRequirement: '32 GB',
    vramRequirement: '20 GB',
    hardware: 'Pro GPU / Multi-VRAM',
    speedRating: 4,
    speedLabel: 'Deep Thought',
    powerRating: 12,
    powerLabel: 'Maximum',
    isDefault: false,
    switchMessage: 'Active model switched to BANTAI Don (32B). Maximum analytical power ready.'
  }
];

export function resolveModel(modelId?: string): ModelInfo {
  if (!modelId || typeof modelId !== 'string') {
    return APP_MODELS[1]; // Bhai
  }

  const normalized = modelId.toLowerCase().trim();

  // 1. Direct match on ID
  const directMatch = APP_MODELS.find(m => m.id === normalized);
  if (directMatch) return directMatch;

  // 2. Partial match on shortName
  const shortMatch = APP_MODELS.find(m => normalized.includes(m.shortName.toLowerCase()));
  if (shortMatch) return shortMatch;

  // 3. Fallback matching baseModel substring
  if (normalized.includes('3b')) return APP_MODELS[0];
  if (normalized.includes('14b')) return APP_MODELS[2];
  if (normalized.includes('32b')) return APP_MODELS[3];

  // Default to Bhai (7B)
  return APP_MODELS[1];
}
