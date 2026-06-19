import type { PagesFunction } from '@cloudflare/workers-types';

interface Env { DB: D1Database; }

function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10);
}

function makeSeedRollups(days: number) {
  return Array.from({ length: days }, (_, i) => {
    const day = days - 1 - i; const date = daysAgo(day);
    const active = Math.round(380 + Math.sin(day) * 120);
    const burn = 1890 + active; const intake = Math.round(2050 + Math.sin(day * 1.1) * 150);
    return { date, intake_kcal: intake, burn_kcal: burn, balance_kcal: intake - burn };
  });
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const range = url.searchParams.get('range') || '30d';
  let days = 30;
  if (range === '90d') days = 90;
  else if (range === '6mo') days = 180;

  if (!context.env.DB) {
    return new Response(JSON.stringify({
      rollups: makeSeedRollups(days),
      scans: [{ id: 1, user_id: 1, scan_date: daysAgo(49), weight_kg: 82.0, bodyfat_pct: 19.5, fat_mass_kg: 15.99, skeletal_muscle_kg: 42.0, lean_mass_kg: 66.01, bmr: 1890, visceral_fat: 8, raw_extract_json: null, image_ref: null }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  const since = new Date(); since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);

  const [rollups, scans] = await Promise.all([
    context.env.DB.prepare('SELECT * FROM daily_rollup WHERE user_id = 1 AND date >= ? ORDER BY date ASC').bind(sinceStr).all(),
    context.env.DB.prepare('SELECT * FROM inbody_scans WHERE user_id = 1 AND scan_date >= ? ORDER BY scan_date ASC').bind(sinceStr).all(),
  ]);

  return new Response(JSON.stringify({ rollups: rollups.results ?? [], scans: scans.results ?? [] }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
};
