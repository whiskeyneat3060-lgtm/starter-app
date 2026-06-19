// Seed data — used when API is unavailable or ANTHROPIC_API_KEY not set
import type { DashboardData, FoodEntry, BurnEntry, DailyRollup, InbodyScan } from '../types';

const TODAY = new Date().toISOString().slice(0, 10);

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export const SEED_INBODY: InbodyScan = {
  id: 1, user_id: 1,
  scan_date: daysAgo(49),
  weight_kg: 82.0,
  bodyfat_pct: 19.5,
  fat_mass_kg: 15.99,
  skeletal_muscle_kg: 42.0,
  lean_mass_kg: 66.01,
  bmr: 1890,
  visceral_fat: 8,
  raw_extract_json: null,
  image_ref: null,
};

function makeBurn(date: string, day: number): BurnEntry {
  const active = 380 + Math.sin(day) * 120;
  return {
    id: day, user_id: 1, date,
    total_kcal: Math.round(1890 + active),
    active_kcal: Math.round(active),
    resting_kcal: 1890,
    steps: Math.round(7000 + Math.cos(day * 1.3) * 3000),
    resting_hr: Math.round(54 + Math.sin(day * 0.7) * 4),
    source: 'garmin',
  };
}

export const SEED_ROLLUPS: DailyRollup[] = Array.from({ length: 14 }, (_, i) => {
  const day = 13 - i;
  const date = daysAgo(day);
  const burn = makeBurn(date, day);
  const intake = Math.round(2050 + Math.sin(day * 1.1) * 150);
  return { date, intake_kcal: intake, burn_kcal: burn.total_kcal, balance_kcal: intake - burn.total_kcal };
});

const seedFood: Omit<FoodEntry, 'id' | 'user_id'>[] = [
  { captured_at: `${TODAY}T07:45:00Z`, meal_bucket: 'breakfast', image_ref: null, description: 'Greek yoghurt with oats and banana', confidence: 0.88, kcal: 420, protein_g: 32, carbs_g: 52, fat_g: 8, fibre_g: 6, items_json: null, user_adjusted: 0 },
  { captured_at: `${TODAY}T12:30:00Z`, meal_bucket: 'lunch', image_ref: null, description: 'Chicken breast with rice and broccoli', confidence: 0.92, kcal: 580, protein_g: 52, carbs_g: 64, fat_g: 9, fibre_g: 5, items_json: null, user_adjusted: 0 },
  { captured_at: `${TODAY}T16:00:00Z`, meal_bucket: 'snack', image_ref: null, description: 'Cottage cheese and apple', confidence: 0.85, kcal: 210, protein_g: 22, carbs_g: 24, fat_g: 2, fibre_g: 3, items_json: null, user_adjusted: 0 },
];

export const SEED_TODAY_FOOD: FoodEntry[] = seedFood.map((f, i) => ({ ...f, id: i + 1, user_id: 1 }));

export const SEED_TODAY_BURN: BurnEntry = makeBurn(TODAY, 0);

export const SEED_DASHBOARD: DashboardData = {
  today: { date: TODAY, intake_kcal: 1210, burn_kcal: SEED_TODAY_BURN.total_kcal, balance_kcal: 1210 - SEED_TODAY_BURN.total_kcal },
  todayBurn: SEED_TODAY_BURN,
  todayFood: SEED_TODAY_FOOD,
  latestInbody: SEED_INBODY,
  activeGoal: { id: 1, user_id: 1, target_bodyfat_pct: 12, target_weight_kg: null, target_lean_kg: null, target_date: '2026-09-01', created_at: '2026-01-01T00:00:00Z', active: 1 },
  rollups14: SEED_ROLLUPS,
  macroTargets: { kcal: 2100, protein_g: 180, carbs_g: 200, fat_g: 60 },
};
