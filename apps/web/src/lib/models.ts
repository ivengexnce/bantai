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
    hardware: 'CPU only'
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
    hardware: 'Consumer GPU / CPU'
  }
];

export function resolveModel(modelId?: string): ModelInfo {
  if (!modelId || typeof modelId !== 'string') {
    return APP_MODELS[1] || APP_MODELS[0]; // Bhai
  }

  const normalized = modelId.toLowerCase().trim();

  // 1. Direct match on ID
  const directMatch = APP_MODELS.find(m => m.id === normalized);
  if (directMatch) return directMatch;

  // 2. Partial match on shortName
  const shortMatch = APP_MODELS.find(m => normalized.includes(m.shortName.toLowerCase()));
  if (shortMatch) return shortMatch;

  // 3. Fallback matching baseModel substring
  if (normalized.includes('3b') || normalized.includes('chhotu')) return APP_MODELS[0];

  // Default to Bhai (7B)
  return APP_MODELS[1] || APP_MODELS[0];
}
