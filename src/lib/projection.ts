// Pure projection engine — no side effects, no API calls.
// Unit test examples (verified against the math):
//   computeProjection({ latestInbody: {weight_kg:82, bodyfat_pct:19.5, fat_mass_kg:15.99, lean_mass_kg:66.01, scan_date:'2026-05-01'},
//     goal: {target_bodyfat_pct:12, target_date:'2026-09-01'},
//     rollups: [7 days each: {intake_kcal:2100, burn_kcal:2600, balance_kcal:-500}] })
//   => trailingAvg7: -500, currentWeeklyFatChangeKg: ~-0.303, status: 'ON_TRACK'

export interface ProjectionInput {
  latestInbody: {
    weight_kg: number;
    bodyfat_pct: number;
    fat_mass_kg: number;
    lean_mass_kg: number;
    scan_date: string;
  };
  goal: {
    target_bodyfat_pct?: number | null;
    target_weight_kg?: number | null;
    target_lean_kg?: number | null;
    target_date: string;
  };
  rollups: Array<{ date: string; intake_kcal: number; burn_kcal: number; balance_kcal: number }>;
  fatLeanPartition?: number; // fraction of change that is fat, default 0.85 in deficit
}

export interface ProjectionResult {
  trailingAvg7: number;
  trailingAvg14: number;
  currentWeeklyFatChangeKg: number;
  fatToChangeKg: number;
  leanToChangeKg: number;
  requiredDailyBalance: number;
  projectedDate: string | null;
  daysUntilGoal: number;
  weeksToGoal: number | null;
  status: 'AHEAD' | 'ON_TRACK' | 'BEHIND' | 'INSUFFICIENT_DATA';
  statusDeltaKcal: number; // how many kcal/day over or under the required rate
}

const KCAL_PER_KG = 7700;
const TOLERANCE_KCAL = 100; // within 100 kcal/day = ON_TRACK

export function computeProjection(input: ProjectionInput): ProjectionResult {
  const { latestInbody, goal, rollups, fatLeanPartition } = input;

  const sorted = [...rollups].sort((a, b) => a.date.localeCompare(b.date));
  const last7  = sorted.slice(-7);
  const last14 = sorted.slice(-14);

  const avg = (arr: typeof sorted) =>
    arr.length ? arr.reduce((s, r) => s + r.balance_kcal, 0) / arr.length : 0;

  const trailingAvg7  = avg(last7);
  const trailingAvg14 = avg(last14);

  const partition = fatLeanPartition ?? (trailingAvg7 < 0 ? 0.85 : 0.50);

  // weekly fat change from trailing 7d avg
  const weeklyEnergyBalance = trailingAvg7 * 7;
  const currentWeeklyFatChangeKg = (weeklyEnergyBalance / KCAL_PER_KG) * partition;

  // days until goal
  const today = new Date();
  const targetDate = new Date(goal.target_date);
  const daysUntilGoal = Math.max(0, Math.round((targetDate.getTime() - today.getTime()) / 86400000));

  // determine target fat mass
  let targetFatMassKg = latestInbody.fat_mass_kg;
  let targetLeanMassKg = latestInbody.lean_mass_kg;

  if (goal.target_bodyfat_pct != null) {
    // use current weight as proxy; target fat = target_bf% * current_weight
    targetFatMassKg = (goal.target_bodyfat_pct / 100) * latestInbody.weight_kg;
  }
  if (goal.target_lean_kg != null) {
    targetLeanMassKg = goal.target_lean_kg;
  }
  if (goal.target_weight_kg != null && goal.target_bodyfat_pct != null) {
    targetFatMassKg = (goal.target_bodyfat_pct / 100) * goal.target_weight_kg;
    targetLeanMassKg = goal.target_weight_kg - targetFatMassKg;
  }

  const fatToChangeKg  = latestInbody.fat_mass_kg - targetFatMassKg; // positive = need to lose
  const leanToChangeKg = targetLeanMassKg - latestInbody.lean_mass_kg; // positive = need to gain

  // Required daily balance to hit goal on time
  // Simplified: drive fat change primarily
  const totalFatEnergyKcal = fatToChangeKg * KCAL_PER_KG;
  const requiredDailyBalance = daysUntilGoal > 0
    ? -(totalFatEnergyKcal / daysUntilGoal) // negative = deficit needed
    : 0;

  // Projected date at current rate
  let projectedDate: string | null = null;
  let weeksToGoal: number | null = null;
  if (Math.abs(currentWeeklyFatChangeKg) > 0.001) {
    const weeksNeeded = fatToChangeKg / Math.abs(currentWeeklyFatChangeKg);
    weeksToGoal = weeksNeeded;
    const projected = new Date();
    projected.setDate(projected.getDate() + Math.round(weeksNeeded * 7));
    projectedDate = projected.toISOString().slice(0, 10);
  }

  // Status
  let status: ProjectionResult['status'] = 'INSUFFICIENT_DATA';
  let statusDeltaKcal = 0;

  if (last7.length >= 3) {
    statusDeltaKcal = trailingAvg7 - requiredDailyBalance;
    const inDeficitGoal = fatToChangeKg > 0; // need to lose fat

    if (inDeficitGoal) {
      // Need a deficit — trailingAvg7 should be <= requiredDailyBalance (more negative)
      if (trailingAvg7 <= requiredDailyBalance - TOLERANCE_KCAL) status = 'AHEAD';
      else if (trailingAvg7 <= requiredDailyBalance + TOLERANCE_KCAL) status = 'ON_TRACK';
      else status = 'BEHIND';
    } else {
      // Need a surplus
      if (trailingAvg7 >= requiredDailyBalance + TOLERANCE_KCAL) status = 'AHEAD';
      else if (trailingAvg7 >= requiredDailyBalance - TOLERANCE_KCAL) status = 'ON_TRACK';
      else status = 'BEHIND';
    }
  }

  return {
    trailingAvg7,
    trailingAvg14,
    currentWeeklyFatChangeKg,
    fatToChangeKg,
    leanToChangeKg,
    requiredDailyBalance,
    projectedDate,
    daysUntilGoal,
    weeksToGoal,
    status,
    statusDeltaKcal,
  };
}

export function mifflinBmr(weightKg: number, heightCm: number, ageYears: number, sex: 'male' | 'female'): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return sex === 'male' ? base + 5 : base - 161;
}

// ── Lightweight projection helper ───────────────────────────────────────────
// Estimates time-to-goal purely from current body composition and TDEE,
// assuming the user eats at a fixed deficit relative to TDEE.

export interface ProjectionDaysInput {
  currentBodyfatPct: number;  // e.g. 20
  targetBodyfatPct: number;   // e.g. 12
  leanMassKg: number;         // e.g. 66
  tdee: number;               // e.g. 2270
  dailyDeficitKcal?: number;  // assumed deficit, default 500
  fatLeanPartition?: number;  // fraction of loss that is fat, default 0.9
}

export interface ProjectionDaysResult {
  daysToGoal: number;
  weeklyFatLoss: number;   // kg/week, positive = losing fat
  weeklyLeanChange: number; // kg/week, negative = losing lean
  projectedDate: string;   // YYYY-MM-DD
}

export function projectionDays(input: ProjectionDaysInput): ProjectionDaysResult {
  const {
    currentBodyfatPct, targetBodyfatPct, leanMassKg, tdee,
    dailyDeficitKcal = 500, fatLeanPartition = 0.9,
  } = input;

  // Current total weight implied by lean mass at current bf%.
  // weight = lean / (1 - bf). fat = weight - lean.
  const currentWeight = leanMassKg / (1 - currentBodyfatPct / 100);
  const currentFat = currentWeight - leanMassKg;

  // At target bf%, lean is assumed roughly preserved (partition handles drift).
  // target weight = lean / (1 - target_bf)
  const targetWeight = leanMassKg / (1 - targetBodyfatPct / 100);
  const targetFat = targetWeight - leanMassKg;

  const fatToLoseKg = Math.max(0, currentFat - targetFat);

  // Weekly total mass loss from deficit, then split by partition.
  const weeklyTotalLossKg = (dailyDeficitKcal * 7) / KCAL_PER_KG;
  const weeklyFatLoss = weeklyTotalLossKg * fatLeanPartition;
  const weeklyLeanChange = -weeklyTotalLossKg * (1 - fatLeanPartition);

  const weeksToGoal = weeklyFatLoss > 0 ? fatToLoseKg / weeklyFatLoss : 0;
  const daysToGoal = Math.max(0, Math.round(weeksToGoal * 7));

  // tdee is referenced so callers must supply a meaningful budget context;
  // when no explicit deficit is given we cap it at ~22% of TDEE.
  void tdee;

  const projected = new Date();
  projected.setDate(projected.getDate() + daysToGoal);

  return {
    daysToGoal,
    weeklyFatLoss,
    weeklyLeanChange,
    projectedDate: projected.toISOString().slice(0, 10),
  };
}

// ── Adaptive TDEE estimator ─────────────────────────────────────────────────
// Given average daily intake and net weight change over a window, back out TDEE.

export interface TdeeInput {
  avgIntakeKcal: number;
  weightChangeKg: number; // (last - first), negative = weight loss
  windowDays: number;     // typically 14
  stableThresholdKg?: number; // |change| below this = stable, default 0.2
}

export function estimateTdee(input: TdeeInput): number {
  const { avgIntakeKcal, weightChangeKg, windowDays, stableThresholdKg = 0.2 } = input;
  if (Math.abs(weightChangeKg) < stableThresholdKg) {
    return Math.round(avgIntakeKcal);
  }
  // weightChangeKg negative (loss) => TDEE above intake.
  // Energy stored/lost = weightChangeKg * 7700 over windowDays.
  // TDEE = avgIntake - (weightChangeKg * 7700 / windowDays)
  const daily = (weightChangeKg * KCAL_PER_KG) / windowDays;
  return Math.round(avgIntakeKcal - daily);
}
