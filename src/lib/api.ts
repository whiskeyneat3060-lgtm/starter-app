import type { DashboardData, FoodEntry, BurnEntry, Goal, InbodyScan, DailyRollup, FoodAnalyzeResult } from '../types';
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
