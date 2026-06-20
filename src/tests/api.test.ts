import { describe, it, expect } from 'vitest';
import { getDashboard, getWater, getWeight, getTrends, getTdee, getRecentFoods, getProfile } from '../lib/api';

// In non-PROD mode (vitest default), api.ts uses seed data and never hits fetch.
describe('api seed mode', () => {
  it('import.meta.env.PROD is false under vitest', () => {
    expect(import.meta.env.PROD).toBeFalsy();
  });

  it('getDashboard returns seed shape', async () => {
    const d = await getDashboard();
    expect(d).not.toBeNull();
    expect(d).toHaveProperty('today');
    expect(d).toHaveProperty('macroTargets');
    expect(d.macroTargets).toHaveProperty('kcal');
    expect(Array.isArray(d.todayFood)).toBe(true);
  });

  it('getWater returns total + goal', async () => {
    const w = await getWater('2026-06-19');
    expect(w).not.toBeNull();
    expect(w).toHaveProperty('total_ml');
    expect(w).toHaveProperty('goal_ml');
    expect(Array.isArray(w.entries)).toBe(true);
  });

  it('getWeight returns an array of entries', async () => {
    const entries = await getWeight(30);
    expect(Array.isArray(entries)).toBe(true);
    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0]).toHaveProperty('weight_kg');
  });

  it('getTrends returns rollups + scans', async () => {
    const t = await getTrends('30d');
    expect(t).not.toBeNull();
    expect(Array.isArray(t.rollups)).toBe(true);
    expect(Array.isArray(t.scans)).toBe(true);
  });

  it('getTdee returns a tdee number', async () => {
    const t = await getTdee();
    expect(t).not.toBeNull();
    expect(t).toHaveProperty('tdee');
    expect(typeof t.tdee).toBe('number');
  });

  it('getRecentFoods returns an array', async () => {
    const r = await getRecentFoods();
    expect(Array.isArray(r)).toBe(true);
    expect(r[0]).toHaveProperty('description');
  });

  it('getProfile returns macro targets', async () => {
    const p = await getProfile();
    expect(p).toHaveProperty('target_kcal');
    expect(p).toHaveProperty('water_goal_ml');
  });
});
