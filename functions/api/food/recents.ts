import type { PagesFunction } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
}

interface RecentFood {
  description: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fibre_g: number;
  meal_bucket: string;
}

const SEED_RECENTS: RecentFood[] = [
  { description: 'Greek yoghurt with oats and banana', kcal: 420, protein_g: 32, carbs_g: 52, fat_g: 8, fibre_g: 6, meal_bucket: 'breakfast' },
  { description: 'Chicken breast with rice and broccoli', kcal: 580, protein_g: 52, carbs_g: 64, fat_g: 9, fibre_g: 5, meal_bucket: 'lunch' },
  { description: 'Cottage cheese and apple', kcal: 210, protein_g: 22, carbs_g: 24, fat_g: 2, fibre_g: 3, meal_bucket: 'snack' },
  { description: 'Whey protein shake', kcal: 120, protein_g: 24, carbs_g: 4, fat_g: 2, fibre_g: 0, meal_bucket: 'snack' },
  { description: 'Salmon with sweet potato', kcal: 540, protein_g: 40, carbs_g: 38, fat_g: 22, fibre_g: 4, meal_bucket: 'dinner' },
];

// Reads last 20 distinct food entries (by description) from food_entries.
// No separate recent_foods table — see ADR-008 (avoid denormalization).
export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!context.env?.DB) {
    return new Response(JSON.stringify(SEED_RECENTS), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }

  const rows = await context.env.DB.prepare(
    `SELECT description, kcal, protein_g, carbs_g, fat_g, fibre_g, meal_bucket, MAX(captured_at) AS last_at
       FROM food_entries
      WHERE user_id = 1 AND description IS NOT NULL AND description != ''
      GROUP BY description
      ORDER BY last_at DESC
      LIMIT 20`
  ).all<RecentFood>();

  return new Response(JSON.stringify(rows.results ?? []), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
};
