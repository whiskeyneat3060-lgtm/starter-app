import type { PagesFunction } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
}

interface WaterEntry {
  id: number;
  user_id: number;
  logged_at: string;
  ml: number;
}

const SEED_WATER = {
  total_ml: 1800,
  goal_ml: 2500,
  entries: [
    { id: 1, user_id: 1, logged_at: new Date().toISOString(), ml: 500 },
    { id: 2, user_id: 1, logged_at: new Date().toISOString(), ml: 500 },
    { id: 3, user_id: 1, logged_at: new Date().toISOString(), ml: 400 },
    { id: 4, user_id: 1, logged_at: new Date().toISOString(), ml: 400 },
  ],
};

export const onRequest: PagesFunction<Env> = async (context) => {
  const method = context.request.method;
  const url = new URL(context.request.url);

  if (method === 'GET') {
    const date = url.searchParams.get('date') ?? new Date().toISOString().slice(0, 10);

    if (!context.env?.DB) {
      return new Response(JSON.stringify(SEED_WATER), { headers: { 'Content-Type': 'application/json' } });
    }

    const rows = await context.env.DB.prepare(
      `SELECT * FROM water_entries WHERE user_id = 1 AND date(logged_at) = ? ORDER BY logged_at ASC`
    ).bind(date).all<WaterEntry>();

    const entries = rows.results ?? [];
    const total_ml = entries.reduce((s, e) => s + e.ml, 0);

    return new Response(JSON.stringify({ total_ml, goal_ml: 2500, entries }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (method === 'POST') {
    let body: { ml: number };
    try {
      body = await context.request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (!body.ml || body.ml <= 0) {
      return new Response(JSON.stringify({ error: 'ml must be positive' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const entry: WaterEntry = {
      id: Math.floor(Math.random() * 100000),
      user_id: 1,
      logged_at: new Date().toISOString(),
      ml: body.ml,
    };

    if (context.env?.DB) {
      try {
        const row = await context.env.DB.prepare(
          `INSERT INTO water_entries (user_id, ml) VALUES (1, ?) RETURNING *`
        ).bind(body.ml).first<WaterEntry>();
        if (row) return new Response(JSON.stringify(row), { status: 201, headers: { 'Content-Type': 'application/json' } });
      } catch {
        // fall through
      }
    }

    return new Response(JSON.stringify(entry), { status: 201, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response('Method Not Allowed', { status: 405 });
};
