import type { PagesFunction } from '@cloudflare/workers-types';

interface Env { DB: D1Database; }

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS profiles (user_id INTEGER PRIMARY KEY, height_cm REAL, sex TEXT, birth_date TEXT, activity_notes TEXT, meal_window_config_json TEXT DEFAULT '{"breakfast":[5,10.5],"lunch":[10.5,15],"snack":[15,18.5],"dinner":[18.5,23]}', FOREIGN KEY(user_id) REFERENCES users(id))`,
  `CREATE TABLE IF NOT EXISTS goals (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, target_bodyfat_pct REAL, target_weight_kg REAL, target_lean_kg REAL, target_date TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), active INTEGER NOT NULL DEFAULT 1, FOREIGN KEY(user_id) REFERENCES users(id))`,
  `CREATE TABLE IF NOT EXISTS food_entries (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, captured_at TEXT NOT NULL, meal_bucket TEXT NOT NULL, image_ref TEXT, description TEXT, confidence REAL, kcal REAL NOT NULL DEFAULT 0, protein_g REAL NOT NULL DEFAULT 0, carbs_g REAL NOT NULL DEFAULT 0, fat_g REAL NOT NULL DEFAULT 0, fibre_g REAL NOT NULL DEFAULT 0, items_json TEXT, user_adjusted INTEGER NOT NULL DEFAULT 0, FOREIGN KEY(user_id) REFERENCES users(id))`,
  `CREATE TABLE IF NOT EXISTS burn_entries (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, date TEXT NOT NULL, total_kcal REAL NOT NULL DEFAULT 0, active_kcal REAL NOT NULL DEFAULT 0, resting_kcal REAL NOT NULL DEFAULT 0, steps INTEGER NOT NULL DEFAULT 0, resting_hr INTEGER, source TEXT NOT NULL DEFAULT 'manual', FOREIGN KEY(user_id) REFERENCES users(id))`,
  `CREATE TABLE IF NOT EXISTS inbody_scans (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, scan_date TEXT NOT NULL, weight_kg REAL, bodyfat_pct REAL, fat_mass_kg REAL, skeletal_muscle_kg REAL, lean_mass_kg REAL, bmr REAL, visceral_fat REAL, raw_extract_json TEXT, image_ref TEXT, FOREIGN KEY(user_id) REFERENCES users(id))`,
  `CREATE TABLE IF NOT EXISTS daily_rollup (user_id INTEGER NOT NULL, date TEXT NOT NULL, intake_kcal REAL NOT NULL DEFAULT 0, burn_kcal REAL NOT NULL DEFAULT 0, balance_kcal REAL NOT NULL DEFAULT 0, PRIMARY KEY(user_id, date), FOREIGN KEY(user_id) REFERENCES users(id))`,
  `CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), FOREIGN KEY(user_id) REFERENCES users(id))`,
  `CREATE TABLE IF NOT EXISTS custom_foods (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, name TEXT NOT NULL, brand TEXT, serving_desc TEXT, serving_grams REAL, kcal REAL NOT NULL DEFAULT 0, protein_g REAL NOT NULL DEFAULT 0, carbs_g REAL NOT NULL DEFAULT 0, fat_g REAL NOT NULL DEFAULT 0, fibre_g REAL NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')), FOREIGN KEY(user_id) REFERENCES users(id))`,
  `CREATE TABLE IF NOT EXISTS saved_meals (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, name TEXT NOT NULL, auto_named INTEGER NOT NULL DEFAULT 0, meal_bucket_hint TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), FOREIGN KEY(user_id) REFERENCES users(id))`,
  `CREATE TABLE IF NOT EXISTS saved_meal_components (id INTEGER PRIMARY KEY AUTOINCREMENT, saved_meal_id INTEGER NOT NULL, description TEXT NOT NULL, kcal REAL NOT NULL DEFAULT 0, protein_g REAL NOT NULL DEFAULT 0, carbs_g REAL NOT NULL DEFAULT 0, fat_g REAL NOT NULL DEFAULT 0, fibre_g REAL NOT NULL DEFAULT 0, quantity REAL NOT NULL DEFAULT 1, FOREIGN KEY(saved_meal_id) REFERENCES saved_meals(id))`,
  `CREATE TABLE IF NOT EXISTS water_entries (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, logged_at TEXT NOT NULL DEFAULT (datetime('now')), ml REAL NOT NULL, FOREIGN KEY(user_id) REFERENCES users(id))`,
  `CREATE TABLE IF NOT EXISTS weight_entries (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, date TEXT NOT NULL, weight_kg REAL NOT NULL, source TEXT NOT NULL DEFAULT 'manual', smoothed_kg REAL, FOREIGN KEY(user_id) REFERENCES users(id))`,
];

function daysAgo(n: number): string {
  const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10);
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  if (!context.env.DB) {
    return new Response(JSON.stringify({ error: 'No DB binding' }), { status: 400 });
  }

  try {
    for (const sql of SCHEMA_STATEMENTS) {
      await context.env.DB.prepare(sql).run();
    }

    const existing = await context.env.DB.prepare('SELECT id FROM users WHERE id = 1').first();
    if (!existing) {
      await context.env.DB.prepare(`INSERT INTO users (id, name) VALUES (1, 'Aditya')`).run();
      await context.env.DB.prepare(`INSERT INTO profiles (user_id, height_cm, sex, birth_date) VALUES (1, 180, 'male', '1995-01-01')`).run();
    }

    // Always upsert goal
    await context.env.DB.prepare(`DELETE FROM goals WHERE user_id = 1`).run();
    await context.env.DB.prepare(`INSERT INTO goals (user_id, target_bodyfat_pct, target_date, active) VALUES (1, 12, '2026-09-01', 1)`).run();

    // Seed InBody scan if none exists
    const scanCount = await context.env.DB.prepare('SELECT COUNT(*) as c FROM inbody_scans WHERE user_id = 1').first<{c: number}>();
    if (!scanCount || scanCount.c === 0) {
      await context.env.DB.prepare(
        `INSERT INTO inbody_scans (user_id, scan_date, weight_kg, bodyfat_pct, fat_mass_kg, skeletal_muscle_kg, lean_mass_kg, bmr, visceral_fat)
         VALUES (1, ?, 82.0, 19.5, 15.99, 42.0, 66.01, 1890, 8)`
      ).bind(daysAgo(14)).run();
    }

    // Seed 14 days of burn entries if none exist
    const burnCount = await context.env.DB.prepare('SELECT COUNT(*) as c FROM burn_entries WHERE user_id = 1').first<{c: number}>();
    if (!burnCount || burnCount.c === 0) {
      for (let i = 13; i >= 0; i--) {
        const date = daysAgo(i);
        const active = Math.round(380 + Math.sin(i) * 120);
        const total = 1890 + active;
        const steps = Math.round(7000 + Math.cos(i * 1.3) * 3000);
        const hr = Math.round(54 + Math.sin(i * 0.7) * 4);
        const intake = Math.round(2050 + Math.sin(i * 1.1) * 150);
        await context.env.DB.prepare(
          `INSERT OR IGNORE INTO burn_entries (user_id, date, total_kcal, active_kcal, resting_kcal, steps, resting_hr, source)
           VALUES (1, ?, ?, ?, 1890, ?, ?, 'garmin')`
        ).bind(date, total, active, steps, hr).run();
        await context.env.DB.prepare(
          `INSERT OR REPLACE INTO daily_rollup (user_id, date, intake_kcal, burn_kcal, balance_kcal)
           VALUES (1, ?, ?, ?, ?)`
        ).bind(date, intake, total, intake - total).run();
      }
    }

    // Seed today's food if none
    const today = new Date().toISOString().slice(0, 10);
    const foodCount = await context.env.DB.prepare(`SELECT COUNT(*) as c FROM food_entries WHERE user_id = 1 AND date(captured_at) = ?`).bind(today).first<{c: number}>();
    if (!foodCount || foodCount.c === 0) {
      const meals = [
        [`${today}T07:45:00Z`, 'breakfast', 'Greek yoghurt with oats and banana', 0.88, 420, 32, 52, 8, 6],
        [`${today}T12:30:00Z`, 'lunch', 'Chicken breast with rice and broccoli', 0.92, 580, 52, 64, 9, 5],
        [`${today}T16:00:00Z`, 'snack', 'Cottage cheese and apple', 0.85, 210, 22, 24, 2, 3],
      ];
      for (const [at, bucket, desc, conf, kcal, prot, carbs, fat, fibre] of meals) {
        await context.env.DB.prepare(
          `INSERT INTO food_entries (user_id, captured_at, meal_bucket, description, confidence, kcal, protein_g, carbs_g, fat_g, fibre_g)
           VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(at, bucket, desc, conf, kcal, prot, carbs, fat, fibre).run();
      }
      // Update today's rollup intake
      await context.env.DB.prepare(
        `INSERT INTO daily_rollup (user_id, date, intake_kcal, burn_kcal, balance_kcal)
         VALUES (1, ?, 1210, 2270, -1060)
         ON CONFLICT(user_id, date) DO UPDATE SET intake_kcal = 1210, balance_kcal = burn_kcal - 1210`
      ).bind(today).run();
    }

    return new Response(JSON.stringify({ ok: true, message: 'Database initialized and seeded' }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
};
