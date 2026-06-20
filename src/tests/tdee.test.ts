import { describe, it, expect } from 'vitest';
import { estimateTdee } from '../lib/projection';

describe('adaptive TDEE', () => {
  it('returns avg intake when weight is stable', () => {
    const tdee = estimateTdee({ avgIntakeKcal: 2200, weightChangeKg: 0.05, windowDays: 14 });
    expect(tdee).toBe(2200);
  });

  it('treats weight under threshold as stable', () => {
    const tdee = estimateTdee({ avgIntakeKcal: 2200, weightChangeKg: -0.1, windowDays: 14 });
    expect(tdee).toBe(2200);
  });

  it('adds back the deficit when losing weight', () => {
    // 1kg loss over 14 days, avg intake 1900.
    // daily deficit = 1*7700/14 = 550. TDEE = 1900 + 550 = 2450.
    const tdee = estimateTdee({ avgIntakeKcal: 1900, weightChangeKg: -1, windowDays: 14 });
    expect(tdee).toBeCloseTo(2450, 0);
  });

  it('subtracts the surplus when gaining weight', () => {
    const tdee = estimateTdee({ avgIntakeKcal: 2500, weightChangeKg: 1, windowDays: 14 });
    expect(tdee).toBeCloseTo(1950, 0);
  });
});
