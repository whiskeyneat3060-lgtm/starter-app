import type { PagesFunction } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
}

interface FoodRow {
  date: string;
  meal_bucket: string;
  description: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fibre_g: number;
}

const SEED_CSV = `date,meal_bucket,description,kcal,protein_g,carbs_g,fat_g,fibre_g
2026-06-18,breakfast,Greek yogurt with protein powder and granola,420,38,44,8,3
2026-06-18,lunch,Tuna and avocado lettuce wraps,480,46,14,22,5
2026-06-18,dinner,Grilled chicken with brown rice and steamed broccoli,580,54,54,12,7
2026-06-18,snack,Apple with almond butter,270,8,34,14,5
2026-06-17,breakfast,French toast with eggs and berries,440,30,52,14,4
2026-06-17,lunch,Cobb salad with grilled chicken,530,48,18,26,6
2026-06-17,dinner,Chicken breast with roasted vegetables,510,52,30,14,8
2026-06-17,snack,Low fat cheese and crackers,230,16,24,8,1
`;

function escapeCSV(val: string | number): string {
  const str = String(val ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const start = url.searchParams.get('start');
  const end = url.searchParams.get('end');

  if (!context.env?.DB) {
    return new Response(SEED_CSV, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="food-log.csv"',
      },
    });
  }

  let query = 'SELECT date(captured_at) as date, meal_bucket, description, kcal, protein_g, carbs_g, fat_g, fibre_g FROM food_entries WHERE user_id = 1';
  const params: string[] = [];

  if (start) { query += ' AND date(captured_at) >= ?'; params.push(start); }
  if (end) { query += ' AND date(captured_at) <= ?'; params.push(end); }
  query += ' ORDER BY captured_at ASC';

  let stmt = context.env.DB.prepare(query);
  for (let i = 0; i < params.length; i++) {
    stmt = stmt.bind(...params);
  }

  const rows = await stmt.all<FoodRow>();
  const entries = rows.results ?? [];

  const header = 'date,meal_bucket,description,kcal,protein_g,carbs_g,fat_g,fibre_g\n';
  const lines = entries.map(r =>
    [r.date, r.meal_bucket, r.description, r.kcal, r.protein_g, r.carbs_g, r.fat_g, r.fibre_g]
      .map(escapeCSV)
      .join(',')
  ).join('\n');

  return new Response(header + lines, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="food-log.csv"',
    },
  });
};
