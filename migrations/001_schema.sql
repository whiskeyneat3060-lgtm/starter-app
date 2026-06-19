CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id INTEGER PRIMARY KEY,
  height_cm REAL,
  sex TEXT,
  birth_date TEXT,
  activity_notes TEXT,
  meal_window_config_json TEXT DEFAULT '{"breakfast":[5,10.5],"lunch":[10.5,15],"snack":[15,18.5],"dinner":[18.5,23]}',
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  target_bodyfat_pct REAL,
  target_weight_kg REAL,
  target_lean_kg REAL,
  target_date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  active INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS food_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  captured_at TEXT NOT NULL,
  meal_bucket TEXT NOT NULL,
  image_ref TEXT,
  description TEXT,
  confidence REAL,
  kcal REAL NOT NULL DEFAULT 0,
  protein_g REAL NOT NULL DEFAULT 0,
  carbs_g REAL NOT NULL DEFAULT 0,
  fat_g REAL NOT NULL DEFAULT 0,
  fibre_g REAL NOT NULL DEFAULT 0,
  items_json TEXT,
  user_adjusted INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS burn_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  total_kcal REAL NOT NULL DEFAULT 0,
  active_kcal REAL NOT NULL DEFAULT 0,
  resting_kcal REAL NOT NULL DEFAULT 0,
  steps INTEGER NOT NULL DEFAULT 0,
  resting_hr INTEGER,
  source TEXT NOT NULL DEFAULT 'manual',
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS inbody_scans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  scan_date TEXT NOT NULL,
  weight_kg REAL,
  bodyfat_pct REAL,
  fat_mass_kg REAL,
  skeletal_muscle_kg REAL,
  lean_mass_kg REAL,
  bmr REAL,
  visceral_fat REAL,
  raw_extract_json TEXT,
  image_ref TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS daily_rollup (
  user_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  intake_kcal REAL NOT NULL DEFAULT 0,
  burn_kcal REAL NOT NULL DEFAULT 0,
  balance_kcal REAL NOT NULL DEFAULT 0,
  PRIMARY KEY(user_id, date),
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(user_id) REFERENCES users(id)
);
