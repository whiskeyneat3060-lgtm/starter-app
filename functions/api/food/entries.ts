import type { PagesFunction } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const date = url.searchParams.get('date') || new Date().toISOString().slice(0, 10);

  const rows = await context.env.DB.prepare(
    `SELECT * FROM food_entries WHERE user_id = 1 AND date(captured_at) = ? ORDER BY captured_at ASC`
  ).bind(date).all();

  // Group by bucket
  const grouped: Record<string, unknown[]> = {
    breakfast: [],
    lunch: [],
    snack: [],
    dinner: [],
  };

  for (const row of rows.results ?? []) {
    const bucket = (row as Record<string, unknown>).meal_bucket as string;
    if (grouped[bucket]) {
      grouped[bucket].push(row);
    }
  }

  return new Response(JSON.stringify(grouped), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const onRequestPatch: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const parts = url.pathname.split('/');
  const id = parts[parts.length - 1];

  const body = await context.request.json<{ multiplier?: number; kcal?: number; protein_g?: number; carbs_g?: number; fat_g?: number; fibre_g?: number }>();

  if (body.multiplier !== undefined) {
    // Apply multiplier to all macros
    const existing = await context.env.DB.prepare(
      'SELECT kcal, protein_g, carbs_g, fat_g, fibre_g FROM food_entries WHERE id = ? AND user_id = 1'
    ).bind(id).first<{ kcal: number; protein_g: number; carbs_g: number; fat_g: number; fibre_g: number }>();

    if (!existing) {
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    }

    await context.env.DB.prepare(
      `UPDATE food_entries SET kcal = ?, protein_g = ?, carbs_g = ?, fat_g = ?, fibre_g = ?, user_adjusted = 1 WHERE id = ?`
    ).bind(
      existing.kcal * body.multiplier,
      existing.protein_g * body.multiplier,
      existing.carbs_g * body.multiplier,
      existing.fat_g * body.multiplier,
      existing.fibre_g * body.multiplier,
      id,
    ).run();
  } else {
    const fields: string[] = [];
    const values: unknown[] = [];
    for (const key of ['kcal', 'protein_g', 'carbs_g', 'fat_g', 'fibre_g']) {
      if (body[key as keyof typeof body] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(body[key as keyof typeof body]);
      }
    }
    if (fields.length > 0) {
      values.push(id);
      await context.env.DB.prepare(
        `UPDATE food_entries SET ${fields.join(', ')}, user_adjusted = 1 WHERE id = ? AND user_id = 1`
      ).bind(...values).run();
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
