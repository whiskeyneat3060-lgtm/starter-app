import type { PagesFunction } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
}

interface CustomFood {
  id: number;
  user_id: number;
  name: string;
  brand: string | null;
  serving_desc: string | null;
  serving_grams: number | null;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fibre_g: number;
  created_at: string;
}

const SEED_CUSTOM_FOODS: CustomFood[] = [
  { id: 1, user_id: 1, name: 'My Protein Shake', brand: null, serving_desc: '1 scoop (30g)', serving_grams: 30, kcal: 120, protein_g: 24, carbs_g: 4, fat_g: 2, fibre_g: 0, created_at: '2026-06-01T00:00:00Z' },
];

export const onRequest: PagesFunction<Env> = async (context) => {
  const method = context.request.method;

  if (method === 'GET') {
    if (!context.env?.DB) {
      return new Response(JSON.stringify(SEED_CUSTOM_FOODS), { headers: { 'Content-Type': 'application/json' } });
    }
    const rows = await context.env.DB.prepare(
      'SELECT * FROM custom_foods WHERE user_id = 1 ORDER BY name ASC'
    ).all<CustomFood>();
    return new Response(JSON.stringify(rows.results ?? []), { headers: { 'Content-Type': 'application/json' } });
  }

  if (method === 'POST') {
    let body: Partial<CustomFood>;
    try {
      body = await context.request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (!body.name?.trim()) {
      return new Response(JSON.stringify({ error: 'name required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const newFood: CustomFood = {
      id: Math.floor(Math.random() * 100000),
      user_id: 1,
      name: body.name,
      brand: body.brand ?? null,
      serving_desc: body.serving_desc ?? null,
      serving_grams: body.serving_grams ?? null,
      kcal: body.kcal ?? 0,
      protein_g: body.protein_g ?? 0,
      carbs_g: body.carbs_g ?? 0,
      fat_g: body.fat_g ?? 0,
      fibre_g: body.fibre_g ?? 0,
      created_at: new Date().toISOString(),
    };

    if (context.env?.DB) {
      try {
        const row = await context.env.DB.prepare(
          `INSERT INTO custom_foods (user_id, name, brand, serving_desc, serving_grams, kcal, protein_g, carbs_g, fat_g, fibre_g)
           VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`
        ).bind(
          newFood.name, newFood.brand, newFood.serving_desc, newFood.serving_grams,
          newFood.kcal, newFood.protein_g, newFood.carbs_g, newFood.fat_g, newFood.fibre_g
        ).first<CustomFood>();
        if (row) return new Response(JSON.stringify(row), { status: 201, headers: { 'Content-Type': 'application/json' } });
      } catch {
        // fall through
      }
    }

    return new Response(JSON.stringify(newFood), { status: 201, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response('Method Not Allowed', { status: 405 });
};
