import type { PagesFunction } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
  INGEST_SHARED_SECRET: string;
}

interface BurnDay {
  date: string;
  total_kcal: number;
  active_kcal: number;
  resting_kcal: number;
  steps: number;
  resting_hr?: number;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const secret = context.request.headers.get('X-Ingest-Secret');
  if (!secret || secret !== context.env.INGEST_SHARED_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const days = await context.request.json<BurnDay[]>();

  for (const day of days) {
    await context.env.DB.prepare(
      `INSERT INTO burn_entries (user_id, date, total_kcal, active_kcal, resting_kcal, steps, resting_hr, source)
       VALUES (1, ?, ?, ?, ?, ?, ?, 'garmin')
       ON CONFLICT(user_id, date) DO UPDATE SET
         total_kcal = excluded.total_kcal,
         active_kcal = excluded.active_kcal,
         resting_kcal = excluded.resting_kcal,
         steps = excluded.steps,
         resting_hr = excluded.resting_hr,
         source = 'garmin'`
    ).bind(day.date, day.total_kcal, day.active_kcal, day.resting_kcal, day.steps, day.resting_hr ?? null).run();

    // Update daily_rollup burn
    await context.env.DB.prepare(
      `INSERT INTO daily_rollup (user_id, date, burn_kcal, intake_kcal, balance_kcal)
       VALUES (1, ?, ?, 0, ?)
       ON CONFLICT(user_id, date) DO UPDATE SET
         burn_kcal = excluded.burn_kcal,
         balance_kcal = intake_kcal - excluded.burn_kcal`
    ).bind(day.date, day.total_kcal, -day.total_kcal).run();
  }

  return new Response(JSON.stringify({ ok: true, count: days.length }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
