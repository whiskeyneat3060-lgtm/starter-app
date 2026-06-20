import { describe, it, expect } from 'vitest';

// Macro energy: protein 4 kcal/g, carbs 4 kcal/g, fat 9 kcal/g.
function macroKcal(protein_g: number, carbs_g: number, fat_g: number): number {
  return protein_g * 4 + carbs_g * 4 + fat_g * 9;
}

describe('macro math', () => {
  it('macro grams approximately sum to the kcal target', () => {
    // 180*4 + 200*4 + 60*9 = 720 + 800 + 540 = 2060, target 2100.
    const computed = macroKcal(180, 200, 60);
    expect(computed).toBeCloseTo(2060, 0);
    expect(Math.abs(computed - 2100)).toBeLessThanOrEqual(100);
  });

  it('returns 0 when all macros are 0', () => {
    expect(macroKcal(0, 0, 0)).toBe(0);
  });

  it('weights fat at 9 kcal/g', () => {
    expect(macroKcal(0, 0, 10)).toBe(90);
    expect(macroKcal(10, 0, 0)).toBe(40);
    expect(macroKcal(0, 10, 0)).toBe(40);
  });
});
