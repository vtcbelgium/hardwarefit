// Local LLM VRAM and hardware fit calculator
// Harvested & extended from @othrys-blocks/ai/local-vram-estimator

export type DeviceKind = 'nvidia' | 'amd' | 'apple' | 'cpu';
export type FitLevel = 'likely' | 'borderline' | 'too-large';

export interface ModelFit {
  label: string;
  size: number;
  weightsGb: number;
  estimateGb: number;
  fit: FitLevel;
  note: string;
}

export interface ModelTier {
  label: string;
  size: number;
  note: string;
}

export const KNOWN_TIERS: ModelTier[] = [
  { label: '3B Tiny (Phi-3.5, Qwen2.5-3B, Llama-3.2-3B)', size: 3, note: 'Ultra-fast lightweight drafting & edge agents' },
  { label: '7–8B Standard (Qwen2.5-7B, Llama-3.1-8B, Mistral-7B)', size: 8, note: 'Ideal local dev default for coding & daily reasoning' },
  { label: '14B Heavy (Qwen2.5-14B, DeepSeek-R1-14B)', size: 14, note: 'Excellent coding depth & chain-of-thought analysis' },
  { label: '27–32B High-Capability (Qwen2.5-32B, Gemma-2-27B)', size: 32, note: 'Near-frontier reasoning; requires 24GB+ VRAM or Unified Mac' },
  { label: '70B Enterprise (Llama-3.3-70B, Qwen2.5-72B)', size: 70, note: 'State of the art open weights; requires dual GPUs or 64GB+ RAM' },
];

export function adviseLocalModel(
  kind: DeviceKind,
  vramGb: number,
  ramGb: number,
  contextK: number = 8
): { models: ModelFit[]; intro: string; warning: string; usableMemory: number } {
  if (!Number.isFinite(vramGb) || !Number.isFinite(ramGb) || vramGb < 0 || ramGb < 1) {
    throw new Error('Enter valid memory amounts.');
  }

  const usable = kind === 'apple' ? ramGb : kind === 'cpu' ? ramGb : vramGb;

  const models = KNOWN_TIERS.map(tier => {
    // 4-bit (Q4_K_M) quantization weights approx ~0.62 GB per billion params
    const weightsGb = +(tier.size * 0.62).toFixed(1);
    
    // KV cache + context buffer + runtime overhead
    // Approx 0.15 GB per 4k context for 8B, scaling with model dimension
    const contextOverhead = +((contextK / 8) * Math.max(0.8, tier.size * 0.12)).toFixed(1);
    const osOverhead = 1.0;
    const estimateGb = +(weightsGb + contextOverhead + osOverhead).toFixed(1);

    const headroom = kind === 'apple' || kind === 'cpu' ? 4 : 1;
    const fit: FitLevel =
      estimateGb + headroom <= usable
        ? 'likely'
        : estimateGb <= usable + 0.8
        ? 'borderline'
        : 'too-large';

    return { ...tier, weightsGb, estimateGb, fit };
  });

  const intro =
    kind === 'apple'
      ? 'Estimating against Apple Silicon unified system memory. Fast GPU access across full RAM pool.'
      : kind === 'cpu'
      ? 'Estimating against system RAM. Model will run purely on CPU; inference latency will be slower.'
      : 'Estimating against dedicated discrete GPU VRAM. Pure GPU offload provides lowest latency.';

  const warning =
    'Estimates assume Q4_K_M quantization with runtime context headroom. OS display reservations, shared RAM, and context lengths (>32k) will increase memory requirements.';

  return { models, intro, warning, usableMemory: usable };
}
