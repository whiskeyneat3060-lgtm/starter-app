import type { PagesFunction } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
}

interface WeightEntry {
  id: number;
  user_id: number;
  date: string;
  weight_kg: number;
  source: string;
  smoothed_kg: number | null;
}

function generateSeedWeights(): WeightEntry[] {
  const entries: WeightEntry[] = [];
  let smoothed = 82.0;
  const alpha = 0.1;
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const date = d.toISOString().slice(0, 10);
    const noise = (Math.random() - 0.5) * 0.6;
    const trend = -0.03;
    const weight_kg = Math.round((82.0 + trend * (29 - i) + noise) * 10) / 10;
    smoothed = alpha * weight_kg + (1 - alpha) * smoothed;
    entries.push({
      id: 30 - i,
      user_id: 1,
      date,
      weight_kg,
      source: 'manual',
      smoothed_kg: Math.round(smoothed * 100) / 100,
    });
  }
  return entries;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const method = context.request.method;
  const url = new URL(context.request.url);

  if (method === 'GET') {
    const days = parseInt(url.searchParams.get('days') ?? '30', 10);

    if (!context.env?.DB) {
      const seed = generateSeedWeights().slice(-days);
      return new Response(JSON.stringify(seed), { headers: { 'Content-Type': 'application/json' } });
    }

    const rows = await context.env.DB.prepare(
      `SELECT * FROM weight_entries WHERE user_id = 1 ORDER BY date ASC LIMIT ?`
    ).bind(days).all<WeightEntry>();

    const entries = rows.results ?? [];
    let smoothed = entries[0]?.weight_kg ?? 80;
    const alpha = 0.1;
    const result = entries.map(e => {
      smoothed = alpha * e.weight_kg + (1 - alpha) * smoothed;
      return { ...e, smoothed_kg: Math.round(smoothed * 100) / 100 };
    });

    return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
  }

  if (method === 'POST') {
    let body: { weight_kg: number; date?: string };
    try {
      body = await context.request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (!body.weight_kg || body.weight_kg <= 0) {
      return new Response(JSON.stringify({ error: 'weight_kg required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const date = body.date ?? new Date().toISOString().slice(0, 10);

    const entry: WeightEntry = {
      id: Math.floor(Math.random() * 100000),
      user_id: 1,
      date,
      weight_kg: body.weight_kg,
      source: 'manual',
      smoothed_kg: null,
    };

    if (context.env?.DB) {
      try {
        const row = await context.env.DB.prepare(
          `INSERT INTO weight_entries (user_id, date, weight_kg, source) VALUES (1, ?, ?, 'manual') RETURNING *`
        ).bind(date, body.weight_kg).first<WeightEntry>();
        if (row) return new Response(JSON.stringify(row), { status: 201, headers: { 'Content-Type': 'application/json' } });
      } catch {
        // fall through
      }
    }

    return new Response(JSON.stringify(entry), { status: 201, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response('Method Not Allowed', { status: 405 });
};
