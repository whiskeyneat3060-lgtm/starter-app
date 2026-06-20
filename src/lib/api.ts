import type { DashboardData, FoodEntry, BurnEntry, Goal, InbodyScan, DailyRollup, FoodAnalyzeResult, TextLogResult, CustomFood, SavedMeal, WaterData, WeightEntry, RecentFood, TdeeData, MacroTargets } from '../types';
import { SEED_DASHBOARD, SEED_TODAY_FOOD, SEED_ROLLUPS, SEED_INBODY } from './seed';

const USE_SEED = !import.meta.env.PROD; // always use seed in dev; prod uses real functions

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: 'include', ...options });
  if (res.status === 401) { window.location.href = '/login'; throw new Error('Unauthorized'); }
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export async function login(pin: string): Promise<void> {
  await apiFetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin }),
  });
}

export async function logout(): Promise<void> {
  await apiFetch('/api/auth/logout', { method: 'POST' });
}

export async function getMe(): Promise<{ userId: number; name: string } | null> {
  try {
    return await apiFetch('/api/auth/me');
  } catch {
    return null;
  }
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export async function getDashboard(): Promise<DashboardData> {
  if (USE_SEED) return SEED_DASHBOARD;
  return apiFetch<DashboardData>('/api/dashboard');
}

// ── Food ──────────────────────────────────────────────────────────────────────

export async function analyzeFood(file: File): Promise<FoodAnalyzeResult> {
  const form = new FormData();
  form.append('image', file);
  return apiFetch<FoodAnalyzeResult>('/api/food/analyze', { method: 'POST', body: form });
}

export async function getFoodEntries(date: string): Promise<FoodEntry[]> {
  if (USE_SEED) return SEED_TODAY_FOOD;
  return apiFetch<FoodEntry[]>(`/api/food/entries?date=${date}`);
}

export async function adjustFoodEntry(id: number, multiplier: number): Promise<void> {
  await apiFetch(`/api/food/entries/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ multiplier }),
  });
}

// ── Burn ──────────────────────────────────────────────────────────────────────

export async function getBurnEntry(date: string): Promise<BurnEntry | null> {
  if (USE_SEED) return SEED_DASHBOARD.todayBurn;
  return apiFetch<BurnEntry | null>(`/api/burn/entries?date=${date}`);
}

export async function logBurnManual(entry: Omit<BurnEntry, 'id' | 'user_id' | 'source'>): Promise<void> {
  await apiFetch('/api/burn/entries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...entry, source: 'manual' }),
  });
}

// ── Goals ─────────────────────────────────────────────────────────────────────

export async function getActiveGoal(): Promise<Goal | null> {
  if (USE_SEED) return SEED_DASHBOARD.activeGoal;
  return apiFetch<Goal | null>('/api/goals');
}

export async function saveGoal(goal: Partial<Goal>): Promise<Goal> {
  return apiFetch<Goal>('/api/goals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(goal),
  });
}

// ── InBody ────────────────────────────────────────────────────────────────────

export async function analyzeInbody(file: File): Promise<InbodyScan> {
  const form = new FormData();
  form.append('image', file);
  return apiFetch<InbodyScan>('/api/inbody/analyze', { method: 'POST', body: form });
}

// ── Trends ────────────────────────────────────────────────────────────────────

export async function getTrends(range: '30d' | '90d' | '6mo'): Promise<{ rollups: DailyRollup[]; scans: InbodyScan[] }> {
  if (USE_SEED) return { rollups: SEED_ROLLUPS, scans: [SEED_INBODY] };
  return apiFetch(`/api/trends?range=${range}`);
}

// ── Text food log ─────────────────────────────────────────────────────────────

export async function textLogFood(text: string, meal_bucket?: string): Promise<TextLogResult> {
  return apiFetch<TextLogResult>('/api/food/text-log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, meal_bucket }),
  });
}

// ── Custom foods ──────────────────────────────────────────────────────────────

const SEED_CUSTOM_FOODS: CustomFood[] = [
  { id: 1, user_id: 1, name: 'My Protein Shake', brand: null, serving_desc: '1 scoop', serving_grams: 30, kcal: 120, protein_g: 24, carbs_g: 4, fat_g: 2, fibre_g: 0, created_at: '2026-06-01T00:00:00Z' },
];

export async function getCustomFoods(): Promise<CustomFood[]> {
  if (USE_SEED) return SEED_CUSTOM_FOODS;
  return apiFetch<CustomFood[]>('/api/custom-foods');
}

export async function createCustomFood(food: Omit<CustomFood, 'id' | 'user_id' | 'created_at'>): Promise<CustomFood> {
  return apiFetch<CustomFood>('/api/custom-foods', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(food),
  });
}

// ── Saved meals ───────────────────────────────────────────────────────────────

const SEED_SAVED_MEALS: SavedMeal[] = [
  {
    id: 1, user_id: 1, name: 'Post-Workout Meal', auto_named: 1, meal_bucket_hint: 'lunch',
    created_at: '2026-06-01T00:00:00Z',
    components: [
      { id: 1, saved_meal_id: 1, description: 'Chicken breast 150g', kcal: 248, protein_g: 47, carbs_g: 0, fat_g: 5, fibre_g: 0, quantity: 1 },
      { id: 2, saved_meal_id: 1, description: 'Brown rice 200g cooked', kcal: 220, protein_g: 5, carbs_g: 47, fat_g: 1, fibre_g: 2, quantity: 1 },
    ],
    total_kcal: 468,
    total_protein_g: 52,
  },
];

export async function getSavedMeals(): Promise<SavedMeal[]> {
  if (USE_SEED) return SEED_SAVED_MEALS;
  return apiFetch<SavedMeal[]>('/api/saved-meals');
}

export async function createSavedMeal(meal: { name: string; meal_bucket_hint?: string; components: import('../types').SavedMealComponent[] }): Promise<SavedMeal> {
  return apiFetch<SavedMeal>('/api/saved-meals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(meal),
  });
}

export async function nameSavedMeal(components: import('../types').SavedMealComponent[]): Promise<string> {
  const result = await apiFetch<{ name: string }>('/api/saved-meals/name', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ components }),
  });
  return result.name;
}

// ── Water ─────────────────────────────────────────────────────────────────────

const SEED_WATER: WaterData = {
  total_ml: 1800,
  goal_ml: 2500,
  entries: [
    { id: 1, user_id: 1, logged_at: new Date().toISOString(), ml: 500 },
    { id: 2, user_id: 1, logged_at: new Date().toISOString(), ml: 500 },
    { id: 3, user_id: 1, logged_at: new Date().toISOString(), ml: 400 },
    { id: 4, user_id: 1, logged_at: new Date().toISOString(), ml: 400 },
  ],
};

export async function getWater(date: string): Promise<WaterData> {
  if (USE_SEED) return SEED_WATER;
  return apiFetch<WaterData>(`/api/water?date=${date}`);
}

export async function logWater(ml: number): Promise<void> {
  await apiFetch('/api/water', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ml }),
  });
}

// ── Weight ────────────────────────────────────────────────────────────────────

function generateSeedWeights(): WeightEntry[] {
  const entries: WeightEntry[] = [];
  let smoothed = 82.0;
  const alpha = 0.1;
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const date = d.toISOString().slice(0, 10);
    const weight_kg = Math.round((82.0 - 0.03 * (29 - i) + (Math.random() - 0.5) * 0.6) * 10) / 10;
    smoothed = alpha * weight_kg + (1 - alpha) * smoothed;
    entries.push({ id: 30 - i, user_id: 1, date, weight_kg, source: 'manual', smoothed_kg: Math.round(smoothed * 100) / 100 });
  }
  return entries;
}

export async function getWeightEntries(days = 30): Promise<WeightEntry[]> {
  if (USE_SEED) return generateSeedWeights().slice(-days);
  return apiFetch<WeightEntry[]>(`/api/weight?days=${days}`);
}

export async function logWeight(weight_kg: number, date?: string): Promise<void> {
  await apiFetch('/api/weight', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ weight_kg, date }),
  });
}

// Alias used by tests / external callers expecting a `getWeight` name.
export const getWeight = getWeightEntries;

// ── Recent foods ────────────────────────────────────────────────────────────

const SEED_RECENTS: RecentFood[] = [
  { description: 'Greek yoghurt with oats and banana', kcal: 420, protein_g: 32, carbs_g: 52, fat_g: 8, fibre_g: 6, meal_bucket: 'breakfast' },
  { description: 'Chicken breast with rice and broccoli', kcal: 580, protein_g: 52, carbs_g: 64, fat_g: 9, fibre_g: 5, meal_bucket: 'lunch' },
  { description: 'Cottage cheese and apple', kcal: 210, protein_g: 22, carbs_g: 24, fat_g: 2, fibre_g: 3, meal_bucket: 'snack' },
  { description: 'Whey protein shake', kcal: 120, protein_g: 24, carbs_g: 4, fat_g: 2, fibre_g: 0, meal_bucket: 'snack' },
  { description: 'Salmon with sweet potato', kcal: 540, protein_g: 40, carbs_g: 38, fat_g: 22, fibre_g: 4, meal_bucket: 'dinner' },
];

export async function getRecentFoods(): Promise<RecentFood[]> {
  if (USE_SEED) return SEED_RECENTS;
  return apiFetch<RecentFood[]>('/api/food/recents');
}

// ── Food history / copy-day ─────────────────────────────────────────────────

export async function getFoodHistory(): Promise<Record<string, FoodEntry[]>> {
  return apiFetch<Record<string, FoodEntry[]>>('/api/food/history');
}

export async function copyDay(from?: string, to?: string): Promise<{ ok: boolean; copied: number }> {
  return apiFetch('/api/food/copy-day', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to }),
  });
}

// ── Adaptive TDEE ───────────────────────────────────────────────────────────

const SEED_TDEE: TdeeData = {
  tdee: 2281, avg_intake_kcal: 2050, weight_change_kg: -0.42, window_days: 14, stable: false,
};

export async function getTdee(): Promise<TdeeData> {
  if (USE_SEED) return SEED_TDEE;
  return apiFetch<TdeeData>('/api/tdee');
}

// ── Profile / macro targets ─────────────────────────────────────────────────

const SEED_PROFILE: MacroTargets = {
  target_kcal: 2100, target_protein_g: 180, target_carbs_g: 200, target_fat_g: 60, water_goal_ml: 2500,
};

export async function getProfile(): Promise<MacroTargets> {
  if (USE_SEED) return SEED_PROFILE;
  return apiFetch<MacroTargets>('/api/profile');
}

export async function updateProfile(targets: Partial<MacroTargets>): Promise<void> {
  await apiFetch('/api/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(targets),
  });
}

export async function setWaterGoal(goal_ml: number): Promise<void> {
  await apiFetch('/api/water', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ goal_ml }),
  });
}
