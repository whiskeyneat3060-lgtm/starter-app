import type { PagesFunction } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
}

interface CopyBody {
  from?: string; // YYYY-MM-DD, defaults to yesterday
  to?: string;   // YYYY-MM-DD, defaults to today
}

function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10);
}

// Duplicates all food_entries from `from` date onto `to` date.
// Clears image_ref and resets user_adjusted. See ADR-007 (copy-day).
export const onRequestPost: PagesFunction<Env> = async (context) => {
  let body: CopyBody = {};
  try { body = await context.request.json(); } catch { /* use defaults */ }

  const from = body.from ?? daysAgo(1);
  const to = body.to ?? new Date().toISOString().slice(0, 10);

  if (!context.env?.DB) {
    return new Response(JSON.stringify({ ok: true, copied: 0, from, to, note: 'no DB (seed mode)' }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }

  const rows = await context.env.DB.prepare(
    `SELECT meal_bucket, description, kcal, protein_g, carbs_g, fat_g, fibre_g, items_json
       FROM food_entries WHERE user_id = 1 AND date(captured_at) = ?`
  ).bind(from).all<{
    meal_bucket: string; description: string | null;
    kcal: number; protein_g: number; carbs_g: number; fat_g: number; fibre_g: number;
    items_json: string | null;
  }>();

  const entries = rows.results ?? [];
  let copied = 0;
  for (const e of entries) {
    const capturedAt = `${to}T${new Date().toISOString().slice(11)}`;
    await context.env.DB.prepare(
      `INSERT INTO food_entries
        (user_id, captured_at, meal_bucket, image_ref, description, confidence, kcal, protein_g, carbs_g, fat_g, fibre_g, items_json, user_adjusted)
       VALUES (1, ?, ?, NULL, ?, NULL, ?, ?, ?, ?, ?, ?, 0)`
    ).bind(capturedAt, e.meal_bucket, e.description, e.kcal, e.protein_g, e.carbs_g, e.fat_g, e.fibre_g, e.items_json).run();
    copied++;
  }

  return new Response(JSON.stringify({ ok: true, copied, from, to }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
};
