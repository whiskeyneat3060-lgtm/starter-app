import type { PagesFunction } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
}

interface FoodEntryRow {
  id: number;
  user_id: number;
  captured_at: string;
  meal_bucket: string;
  description: string | null;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fibre_g: number;
}

function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10);
}

const SEED_HISTORY: Record<string, Partial<FoodEntryRow>[]> = {
  [daysAgo(1)]: [
    { id: 101, captured_at: `${daysAgo(1)}T07:45:00Z`, meal_bucket: 'breakfast', description: 'Oats with berries', kcal: 380, protein_g: 14, carbs_g: 60, fat_g: 8, fibre_g: 9 },
    { id: 102, captured_at: `${daysAgo(1)}T12:30:00Z`, meal_bucket: 'lunch', description: 'Turkey wrap', kcal: 520, protein_g: 38, carbs_g: 48, fat_g: 16, fibre_g: 5 },
    { id: 103, captured_at: `${daysAgo(1)}T19:00:00Z`, meal_bucket: 'dinner', description: 'Salmon with sweet potato', kcal: 540, protein_g: 40, carbs_g: 38, fat_g: 22, fibre_g: 4 },
  ],
  [daysAgo(2)]: [
    { id: 104, captured_at: `${daysAgo(2)}T08:00:00Z`, meal_bucket: 'breakfast', description: 'Eggs on toast', kcal: 360, protein_g: 22, carbs_g: 30, fat_g: 16, fibre_g: 3 },
  ],
};

// Returns food entries from the last 7 days, grouped by date (most recent first).
export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!context.env?.DB) {
    return new Response(JSON.stringify(SEED_HISTORY), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }

  const since = daysAgo(7);
  const rows = await context.env.DB.prepare(
    `SELECT * FROM food_entries
      WHERE user_id = 1 AND date(captured_at) >= ?
      ORDER BY captured_at DESC`
  ).bind(since).all<FoodEntryRow>();

  const grouped: Record<string, FoodEntryRow[]> = {};
  for (const row of rows.results ?? []) {
    const date = row.captured_at.slice(0, 10);
    (grouped[date] ??= []).push(row);
  }

  return new Response(JSON.stringify(grouped), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
};
