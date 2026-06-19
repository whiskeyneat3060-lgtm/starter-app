export interface User { id: number; name: string; created_at: string; }

export interface Profile {
  user_id: number;
  height_cm: number;
  sex: string;
  birth_date: string;
  activity_notes: string;
  meal_window_config_json: string;
}

export interface Goal {
  id: number;
  user_id: number;
  target_bodyfat_pct: number | null;
  target_weight_kg: number | null;
  target_lean_kg: number | null;
  target_date: string;
  created_at: string;
  active: number;
}

export interface FoodEntry {
  id: number;
  user_id: number;
  captured_at: string;
  meal_bucket: 'breakfast' | 'lunch' | 'snack' | 'dinner' | 'other';
  image_ref: string | null;
  description: string | null;
  confidence: number | null;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fibre_g: number;
  items_json: string | null;
  user_adjusted: number;
}

export interface BurnEntry {
  id: number;
  user_id: number;
  date: string;
  total_kcal: number;
  active_kcal: number;
  resting_kcal: number;
  steps: number;
  resting_hr: number | null;
  source: 'garmin' | 'manual' | 'csv';
}

export interface InbodyScan {
  id: number;
  user_id: number;
  scan_date: string;
  weight_kg: number | null;
  bodyfat_pct: number | null;
  fat_mass_kg: number | null;
  skeletal_muscle_kg: number | null;
  lean_mass_kg: number | null;
  bmr: number | null;
  visceral_fat: number | null;
  raw_extract_json: string | null;
  image_ref: string | null;
}

export interface DailyRollup {
  date: string;
  intake_kcal: number;
  burn_kcal: number;
  balance_kcal: number;
}

export interface DashboardData {
  today: DailyRollup | null;
  todayBurn: BurnEntry | null;
  todayFood: FoodEntry[];
  latestInbody: InbodyScan | null;
  activeGoal: Goal | null;
  rollups14: DailyRollup[];
  macroTargets: { kcal: number; protein_g: number; carbs_g: number; fat_g: number };
}

export interface FoodAnalyzeResult {
  description: string;
  confidence: number;
  items: Array<{ name: string; portion: string; kcal: number; protein_g: number; carbs_g: number; fat_g: number; fibre_g: number }>;
  totals: { kcal: number; protein_g: number; carbs_g: number; fat_g: number; fibre_g: number };
  entry_id?: number;
}
