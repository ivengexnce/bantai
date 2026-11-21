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
    switchMessage: 'Active model switched to BANTAI Ustad (14B). Deep reasoning mode ready.'
  },
  {
    id: 'don',
    name: 'BANTAI Don',
    shortName: 'Don',
    displayName: 'BANTAI Don (32B)',
    baseModel: 'qwen2.5:32b',
    parameters: '32B',
    tagline: 'Maximum sovereign intelligence.',
    description: 'Complex mathematical proofs, enterprise agentic execution, heavy research.',
    ramRequirement: '32 GB',
    vramRequirement: '20 GB',
    switchMessage: 'Active model switched to BANTAI Don (32B). Sovereign heavy compute ready.'
  }
];

export function resolveModel(modelId?: string): ModelInfo {
  if (!modelId) return APP_MODELS[1]; // default to Bhai (7B)
  const query = String(modelId).toLowerCase().trim();

  // 1. Direct ID match
  const direct = APP_MODELS.find(m => m.id === query || m.baseModel.toLowerCase() === query);
  if (direct) return direct;

  // 2. Keyword heuristic
  if (query.includes('chhotu') || query.includes('3b')) return APP_MODELS[0];
  if (query.includes('bhai') || query.includes('7b')) return APP_MODELS[1];
  if (query.includes('ustad') || query.includes('14b')) return APP_MODELS[2];
  if (query.includes('don') || query.includes('32b')) return APP_MODELS[3];

  return APP_MODELS[1];
}
