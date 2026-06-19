import type { PagesFunction } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const date = url.searchParams.get('date') || new Date().toISOString().slice(0, 10);

  const row = await context.env.DB.prepare(
    'SELECT * FROM burn_entries WHERE user_id = 1 AND date = ?'
  ).bind(date).first();

  return new Response(JSON.stringify(row ?? null), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const body = await context.request.json<{
    date: string;
    total_kcal: number;
    active_kcal?: number;
    resting_kcal?: number;
    steps?: number;
  }>();

  await context.env.DB.prepare(
    `INSERT INTO burn_entries (user_id, date, total_kcal, active_kcal, resting_kcal, steps, source)
     VALUES (1, ?, ?, ?, ?, ?, 'manual')
     ON CONFLICT DO UPDATE SET
       total_kcal = excluded.total_kcal,
       active_kcal = excluded.active_kcal,
       resting_kcal = excluded.resting_kcal,
       steps = excluded.steps,
       source = 'manual'`
  ).bind(
    body.date,
    body.total_kcal,
    body.active_kcal ?? 0,
    body.resting_kcal ?? 0,
    body.steps ?? 0,
  ).run();

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
