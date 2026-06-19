import type { PagesFunction } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const row = await context.env.DB.prepare(
    'SELECT * FROM goals WHERE user_id = 1 AND active = 1 ORDER BY created_at DESC LIMIT 1'
  ).first();

  return new Response(JSON.stringify(row ?? null), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const body = await context.request.json<{
    target_bodyfat_pct?: number;
    target_weight_kg?: number;
    target_lean_kg?: number;
    target_date: string;
  }>();

  // Deactivate existing goals
  await context.env.DB.prepare('UPDATE goals SET active = 0 WHERE user_id = 1').run();

  await context.env.DB.prepare(
    `INSERT INTO goals (user_id, target_bodyfat_pct, target_weight_kg, target_lean_kg, target_date, active)
     VALUES (1, ?, ?, ?, ?, 1)`
  ).bind(
    body.target_bodyfat_pct ?? null,
    body.target_weight_kg ?? null,
    body.target_lean_kg ?? null,
    body.target_date,
  ).run();

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
