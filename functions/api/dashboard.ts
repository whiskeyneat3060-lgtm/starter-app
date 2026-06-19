import type { PagesFunction } from '@cloudflare/workers-types';

interface Env { DB: D1Database; }

const TODAY = new Date().toISOString().slice(0, 10);

function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10);
}

function makeBurn(date: string, day: number) {
  const active = Math.round(380 + Math.sin(day) * 120);
  return { id: day, user_id: 1, date, total_kcal: 1890 + active, active_kcal: active, resting_kcal: 1890, steps: Math.round(7000 + Math.cos(day * 1.3) * 3000), resting_hr: Math.round(54 + Math.sin(day * 0.7) * 4), source: 'garmin' };
}

const SEED_ROLLUPS = Array.from({ length: 14 }, (_, i) => {
  const day = 13 - i; const date = daysAgo(day);
  const burn = makeBurn(date, day); const intake = Math.round(2050 + Math.sin(day * 1.1) * 150);
  return { date, intake_kcal: intake, burn_kcal: burn.total_kcal, balance_kcal: intake - burn.total_kcal };
});

const SEED_FOOD = [
  { id: 1, user_id: 1, captured_at: `${TODAY}T07:45:00Z`, meal_bucket: 'breakfast', image_ref: null, description: 'Greek yoghurt with oats and banana', confidence: 0.88, kcal: 420, protein_g: 32, carbs_g: 52, fat_g: 8, fibre_g: 6, items_json: null, user_adjusted: 0 },
  { id: 2, user_id: 1, captured_at: `${TODAY}T12:30:00Z`, meal_bucket: 'lunch', image_ref: null, description: 'Chicken breast with rice and broccoli', confidence: 0.92, kcal: 580, protein_g: 52, carbs_g: 64, fat_g: 9, fibre_g: 5, items_json: null, user_adjusted: 0 },
  { id: 3, user_id: 1, captured_at: `${TODAY}T16:00:00Z`, meal_bucket: 'snack', image_ref: null, description: 'Cottage cheese and apple', confidence: 0.85, kcal: 210, protein_g: 22, carbs_g: 24, fat_g: 2, fibre_g: 3, items_json: null, user_adjusted: 0 },
];

const SEED: Record<string, unknown> = {
  today: { date: TODAY, intake_kcal: 1210, burn_kcal: 2250, balance_kcal: -1040 },
  todayBurn: makeBurn(TODAY, 0),
  todayFood: SEED_FOOD,
  latestInbody: { id: 1, user_id: 1, scan_date: daysAgo(49), weight_kg: 82.0, bodyfat_pct: 19.5, fat_mass_kg: 15.99, skeletal_muscle_kg: 42.0, lean_mass_kg: 66.01, bmr: 1890, visceral_fat: 8, raw_extract_json: null, image_ref: null },
  activeGoal: { id: 1, user_id: 1, target_bodyfat_pct: 12, target_weight_kg: null, target_lean_kg: null, target_date: '2026-09-01', created_at: '2026-01-01T00:00:00Z', active: 1 },
  rollups14: SEED_ROLLUPS,
  macroTargets: { kcal: 2100, protein_g: 180, carbs_g: 200, fat_g: 60 },
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!context.env.DB) {
    return new Response(JSON.stringify(SEED), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  const userId = 1;
  const today = new Date().toISOString().slice(0, 10);

  const [todayRollup, latestBurn, goal, latestInbody, sparkline, todayFood] = await Promise.all([
    context.env.DB.prepare('SELECT * FROM daily_rollup WHERE user_id = ? AND date = ?').bind(userId, today).first(),
    context.env.DB.prepare('SELECT * FROM burn_entries WHERE user_id = ? ORDER BY date DESC LIMIT 1').bind(userId).first(),
    context.env.DB.prepare('SELECT * FROM goals WHERE user_id = ? AND active = 1 ORDER BY created_at DESC LIMIT 1').bind(userId).first(),
    context.env.DB.prepare('SELECT * FROM inbody_scans WHERE user_id = ? ORDER BY scan_date DESC LIMIT 1').bind(userId).first(),
    context.env.DB.prepare('SELECT * FROM daily_rollup WHERE user_id = ? ORDER BY date DESC LIMIT 14').bind(userId).all(),
    context.env.DB.prepare(`SELECT * FROM food_entries WHERE user_id = ? AND date(captured_at) = ? ORDER BY captured_at ASC`).bind(userId, today).all(),
  ]);

  return new Response(JSON.stringify({
    today: todayRollup,
    todayBurn: latestBurn,
    todayFood: todayFood.results ?? [],
    latestInbody,
    activeGoal: goal,
    rollups14: (sparkline.results ?? []).reverse(),
    macroTargets: { kcal: 2100, protein_g: 180, carbs_g: 200, fat_g: 60 },
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
