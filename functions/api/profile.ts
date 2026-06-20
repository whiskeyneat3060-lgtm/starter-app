import type { PagesFunction } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
}

const DEFAULT_TARGETS = { target_kcal: 2100, target_protein_g: 180, target_carbs_g: 200, target_fat_g: 60 };

async function ensureProfileColumns(db: D1Database): Promise<void> {
  const cols = [
    'target_kcal INTEGER',
    'target_protein_g INTEGER',
    'target_carbs_g INTEGER',
    'target_fat_g INTEGER',
    'water_goal_ml INTEGER DEFAULT 2500',
  ];
  for (const col of cols) {
    try { await db.prepare(`ALTER TABLE profiles ADD COLUMN ${col}`).run(); }
    catch { /* already exists */ }
  }
}

// GET /api/profile — returns macro targets + water goal. ADR-010.
export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!context.env?.DB) {
    return new Response(JSON.stringify({ ...DEFAULT_TARGETS, water_goal_ml: 2500 }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }

  await ensureProfileColumns(context.env.DB);
  const row = await context.env.DB.prepare(
    'SELECT target_kcal, target_protein_g, target_carbs_g, target_fat_g, water_goal_ml FROM profiles WHERE user_id = 1'
  ).first<Record<string, number | null>>();

  return new Response(JSON.stringify({
    target_kcal: row?.target_kcal ?? DEFAULT_TARGETS.target_kcal,
    target_protein_g: row?.target_protein_g ?? DEFAULT_TARGETS.target_protein_g,
    target_carbs_g: row?.target_carbs_g ?? DEFAULT_TARGETS.target_carbs_g,
    target_fat_g: row?.target_fat_g ?? DEFAULT_TARGETS.target_fat_g,
    water_goal_ml: row?.water_goal_ml ?? 2500,
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

// PUT /api/profile — updates macro targets (and optionally water goal).
export const onRequestPut: PagesFunction<Env> = async (context) => {
  let body: Partial<Record<string, number>>;
  try { body = await context.request.json(); }
  catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json' } }); }

  if (!context.env?.DB) {
    return new Response(JSON.stringify({ ok: true, ...body, note: 'no DB (seed mode)' }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }

  await ensureProfileColumns(context.env.DB);

  // Ensure a profiles row exists for user 1.
  await context.env.DB.prepare(
    `INSERT INTO profiles (user_id) VALUES (1) ON CONFLICT(user_id) DO NOTHING`
  ).run().catch(() => { /* table may have NOT NULL cols without defaults; ignore */ });

  const allowed = ['target_kcal', 'target_protein_g', 'target_carbs_g', 'target_fat_g', 'water_goal_ml'];
  const sets: string[] = [];
  const vals: number[] = [];
  for (const key of allowed) {
    if (body[key] != null) { sets.push(`${key} = ?`); vals.push(body[key]!); }
  }

  if (sets.length > 0) {
    vals.push(1);
    await context.env.DB.prepare(
      `UPDATE profiles SET ${sets.join(', ')} WHERE user_id = ?`
    ).bind(...vals).run();
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
