import type { PagesFunction } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
}

const KCAL_PER_KG = 7700;
const STABLE_THRESHOLD_KG = 0.2;

function estimateTdee(avgIntakeKcal: number, weightChangeKg: number, windowDays: number): number {
  if (Math.abs(weightChangeKg) < STABLE_THRESHOLD_KG) return Math.round(avgIntakeKcal);
  const daily = (weightChangeKg * KCAL_PER_KG) / windowDays;
  return Math.round(avgIntakeKcal - daily);
}

function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10);
}

// GET /api/tdee — adaptive TDEE from last 14 days of intake + weight. ADR-009.
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const windowDays = 14;

  if (!context.env?.DB) {
    // Seed: avg intake ~2050, gentle weight loss ~0.42kg over 14d.
    const avgIntake = 2050;
    const weightChange = -0.42;
    return new Response(JSON.stringify({
      tdee: estimateTdee(avgIntake, weightChange, windowDays),
      avg_intake_kcal: avgIntake,
      weight_change_kg: weightChange,
      window_days: windowDays,
      stable: false,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  const since = daysAgo(windowDays);

  const [rollups, weights] = await Promise.all([
    context.env.DB.prepare(
      `SELECT intake_kcal FROM daily_rollup WHERE user_id = 1 AND date >= ? AND intake_kcal > 0`
    ).bind(since).all<{ intake_kcal: number }>(),
    context.env.DB.prepare(
      `SELECT date, weight_kg FROM weight_entries WHERE user_id = 1 AND date >= ? ORDER BY date ASC`
    ).bind(since).all<{ date: string; weight_kg: number }>(),
  ]);

  const intakes = (rollups.results ?? []).map(r => r.intake_kcal);
  const weightRows = weights.results ?? [];

  if (intakes.length === 0 || weightRows.length < 2) {
    return new Response(JSON.stringify({
      tdee: null, avg_intake_kcal: null, weight_change_kg: null,
      window_days: windowDays, stable: null, note: 'insufficient data',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  const avgIntake = intakes.reduce((s, v) => s + v, 0) / intakes.length;
  const weightChange = weightRows[weightRows.length - 1].weight_kg - weightRows[0].weight_kg;
  const tdee = estimateTdee(avgIntake, weightChange, windowDays);

  return new Response(JSON.stringify({
    tdee,
    avg_intake_kcal: Math.round(avgIntake),
    weight_change_kg: Math.round(weightChange * 100) / 100,
    window_days: windowDays,
    stable: Math.abs(weightChange) < STABLE_THRESHOLD_KG,
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
