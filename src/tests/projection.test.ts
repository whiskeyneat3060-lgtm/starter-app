import { describe, it, expect } from 'vitest';
import { projectionDays } from '../lib/projection';

describe('projectionDays', () => {
  const result = projectionDays({
    currentBodyfatPct: 20,
    targetBodyfatPct: 12,
    leanMassKg: 66,
    tdee: 2270,
  });

  it('returns a positive number of days to goal', () => {
    expect(result.daysToGoal).toBeGreaterThan(0);
  });

  it('predicts weekly fat loss', () => {
    expect(result.weeklyFatLoss).toBeGreaterThan(0);
  });

  it('includes a weekly lean change figure', () => {
    expect(typeof result.weeklyLeanChange).toBe('number');
    // In a deficit some lean is lost, so it should be <= 0.
    expect(result.weeklyLeanChange).toBeLessThanOrEqual(0);
  });

  it('projects a future date', () => {
    const projected = new Date(result.projectedDate);
    expect(projected.getTime()).toBeGreaterThan(Date.now());
  });
});
