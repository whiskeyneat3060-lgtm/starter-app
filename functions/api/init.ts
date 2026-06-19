import type { PagesFunction } from '@cloudflare/workers-types';

interface Env { DB: D1Database; }

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS profiles (
  user_id INTEGER PRIMARY KEY,
  height_cm REAL, sex TEXT, birth_date TEXT, activity_notes TEXT,
  meal_window_config_json TEXT DEFAULT '{"breakfast":[5,10.5],"lunch":[10.5,15],"snack":[15,18.5],"dinner":[18.5,23]}',
  FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL, target_bodyfat_pct REAL, target_weight_kg REAL, target_lean_kg REAL,
  target_date TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), active INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS food_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL, captured_at TEXT NOT NULL, meal_bucket TEXT NOT NULL,
  image_ref TEXT, description TEXT, confidence REAL,
  kcal REAL NOT NULL DEFAULT 0, protein_g REAL NOT NULL DEFAULT 0,
  carbs_g REAL NOT NULL DEFAULT 0, fat_g REAL NOT NULL DEFAULT 0, fibre_g REAL NOT NULL DEFAULT 0,
  items_json TEXT, user_adjusted INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS burn_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL, date TEXT NOT NULL,
  total_kcal REAL NOT NULL DEFAULT 0, active_kcal REAL NOT NULL DEFAULT 0,
  resting_kcal REAL NOT NULL DEFAULT 0, steps INTEGER NOT NULL DEFAULT 0,
  resting_hr INTEGER, source TEXT NOT NULL DEFAULT 'manual',
  FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS inbody_scans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL, scan_date TEXT NOT NULL,
  weight_kg REAL, bodyfat_pct REAL, fat_mass_kg REAL, skeletal_muscle_kg REAL,
  lean_mass_kg REAL, bmr REAL, visceral_fat REAL, raw_extract_json TEXT, image_ref TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS daily_rollup (
  user_id INTEGER NOT NULL, date TEXT NOT NULL,
  intake_kcal REAL NOT NULL DEFAULT 0, burn_kcal REAL NOT NULL DEFAULT 0, balance_kcal REAL NOT NULL DEFAULT 0,
  PRIMARY KEY(user_id, date), FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY, user_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS custom_foods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL, name TEXT NOT NULL, brand TEXT, serving_desc TEXT, serving_grams REAL,
  kcal REAL NOT NULL DEFAULT 0, protein_g REAL NOT NULL DEFAULT 0,
  carbs_g REAL NOT NULL DEFAULT 0, fat_g REAL NOT NULL DEFAULT 0, fibre_g REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS saved_meals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL, name TEXT NOT NULL, auto_named INTEGER NOT NULL DEFAULT 0,
  meal_bucket_hint TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS saved_meal_components (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  saved_meal_id INTEGER NOT NULL, description TEXT NOT NULL,
  kcal REAL NOT NULL DEFAULT 0, protein_g REAL NOT NULL DEFAULT 0,
  carbs_g REAL NOT NULL DEFAULT 0, fat_g REAL NOT NULL DEFAULT 0, fibre_g REAL NOT NULL DEFAULT 0,
  quantity REAL NOT NULL DEFAULT 1,
  FOREIGN KEY(saved_meal_id) REFERENCES saved_meals(id)
);
CREATE TABLE IF NOT EXISTS water_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL, logged_at TEXT NOT NULL DEFAULT (datetime('now')), ml REAL NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS weight_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL, date TEXT NOT NULL, weight_kg REAL NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual', smoothed_kg REAL,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
`;

export const onRequestPost: PagesFunction<Env> = async (context) => {
  if (!context.env.DB) {
    return new Response(JSON.stringify({ error: 'No DB binding' }), { status: 400 });
  }

  try {
    // Run each statement separately (D1 doesn't support multi-statement in one prepare)
    const statements = SCHEMA.split(';').map(s => s.trim()).filter(s => s.length > 0);
    for (const sql of statements) {
      await context.env.DB.prepare(sql).run();
    }

    // Seed user id=1 if not exists
    const existing = await context.env.DB.prepare('SELECT id FROM users WHERE id = 1').first();
    if (!existing) {
      await context.env.DB.prepare(`INSERT INTO users (id, name) VALUES (1, 'Aditya')`).run();
      await context.env.DB.prepare(`INSERT INTO profiles (user_id, height_cm, sex, birth_date) VALUES (1, 180, 'male', '1995-01-01')`).run();
      await context.env.DB.prepare(`INSERT INTO goals (user_id, target_bodyfat_pct, target_date, active) VALUES (1, 12, '2026-09-01', 1)`).run();
    }

    return new Response(JSON.stringify({ ok: true, message: 'Database initialized' }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
};
