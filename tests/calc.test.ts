import { describe, it, expect } from 'vitest';
import { adviseLocalModel } from '../src/calc.ts';

describe('HardwareFit Logic', () => {
  it('throws for invalid memory values', () => {
    expect(() => adviseLocalModel('nvidia', -1, 16)).toThrow();
    expect(() => adviseLocalModel('nvidia', 8, 0)).toThrow();
  });

  it('correctly assesses 8GB Nvidia VRAM', () => {
    const res = adviseLocalModel('nvidia', 8, 16, 8);
    expect(res.usableMemory).toBe(8);

    const small3b = res.models.find(m => m.size === 3);
    expect(small3b?.fit).toBe('likely');

    const standard8b = res.models.find(m => m.size === 8);
    // 8B Q4 ~ 4.96 + 1.0 context + 1.0 OS = ~7.0GB. Fits in 8GB VRAM (likely/borderline)
    expect(['likely', 'borderline']).toContain(standard8b?.fit);

    const heavy70b = res.models.find(m => m.size === 70);
    expect(heavy70b?.fit).toBe('too-large');
  });

  it('uses unified memory for Apple Silicon', () => {
    const res = adviseLocalModel('apple', 0, 36, 16);
    expect(res.usableMemory).toBe(36);

    const model14b = res.models.find(m => m.size === 14);
    expect(model14b?.fit).toBe('likely');
  });

  it('handles CPU system RAM fallback', () => {
    const res = adviseLocalModel('cpu', 0, 32, 8);
    expect(res.usableMemory).toBe(32);
    expect(res.intro).toContain('CPU');
  });
});
