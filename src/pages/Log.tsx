import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getFoodEntries, adjustFoodEntry, logBurnManual, getBurnEntry,
  textLogFood, getCustomFoods, createCustomFood, getSavedMeals, createSavedMeal, nameSavedMeal,
  logWeight, getWeightEntries, getWater, logWater,
  getRecentFoods, copyDay,
} from '../lib/api';
import { Card, CardLabel } from '../components/ui/Card';
import { SkeletonCard } from '../components/ui/SkeletonCard';
import type { FoodEntry, CustomFood, SavedMealComponent } from '../types';

const MEAL_ORDER = ['breakfast', 'lunch', 'snack', 'dinner'] as const;
const MULTIPLIERS = [0.5, 1, 1.5, 2] as const;

function fmt(n: number) { return Math.round(n); }

function getMealBucket(): string {
  const h = new Date().getHours();
  if (h < 10) return 'breakfast';
  if (h < 14) return 'lunch';
  if (h < 17) return 'snack';
  if (h < 21) return 'dinner';
  return 'other';
}

interface AdjustSheet { entry: FoodEntry }
type ActiveSheet = 'none' | 'text-log' | 'quick-add' | 'custom-food-create' | 'build-meal' | 'weight';

export default function Log() {
  const today = new Date().toISOString().slice(0, 10);
  const qc = useQueryClient();

  const [adjustSheet, setAdjustSheet] = useState<AdjustSheet | null>(null);
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>('none');
  const [showBurnForm, setShowBurnForm] = useState(false);
  const [burnForm, setBurnForm] = useState({ total_kcal: '', active_kcal: '', steps: '' });

  const [textInput, setTextInput] = useState('');
  const [textResult, setTextResult] = useState<null | { description: string; kcal: number; protein_g: number; carbs_g: number; fat_g: number }>(null);
  const [textLoading, setTextLoading] = useState(false);

  const [quickKcal, setQuickKcal] = useState('');
  const [quickProtein, setQuickProtein] = useState('');
  const [quickCarbs, setQuickCarbs] = useState('');
  const [quickFat, setQuickFat] = useState('');

  const [cfName, setCfName] = useState('');
  const [cfBrand, setCfBrand] = useState('');
  const [cfServing, setCfServing] = useState('');
  const [cfKcal, setCfKcal] = useState('');
  const [cfProtein, setCfProtein] = useState('');
  const [cfCarbs, setCfCarbs] = useState('');
  const [cfFat, setCfFat] = useState('');

  const [mealComponents, setMealComponents] = useState<SavedMealComponent[]>([]);
  const [mealCompInput, setMealCompInput] = useState('');
  const [mealCompKcal, setMealCompKcal] = useState('');
  const [mealCompProtein, setMealCompProtein] = useState('');
  const [mealSaving, setMealSaving] = useState(false);

  const [weightInput, setWeightInput] = useState('');

  const { data: foodByBucket, isLoading } = useQuery({
    queryKey: ['food', today],
    queryFn: () => getFoodEntries(today),
  });

  const { data: burnEntry } = useQuery({
    queryKey: ['burn', today],
    queryFn: () => getBurnEntry(today),
  });

  const { data: customFoods } = useQuery({
    queryKey: ['custom-foods'],
    queryFn: getCustomFoods,
  });

  const { data: savedMeals } = useQuery({
    queryKey: ['saved-meals'],
    queryFn: getSavedMeals,
  });

  const { data: weightEntries } = useQuery({
    queryKey: ['weight', 7],
    queryFn: () => getWeightEntries(7),
  });

  const { data: waterData } = useQuery({
    queryKey: ['water', today],
    queryFn: () => getWater(today),
  });

  const { data: recentFoods } = useQuery({
    queryKey: ['recent-foods'],
    queryFn: getRecentFoods,
  });

  const copyDayMutation = useMutation({
    mutationFn: () => copyDay(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['food'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['recent-foods'] });
    },
  });

  const logRecentMutation = useMutation({
    mutationFn: (desc: string) => textLogFood(desc, getMealBucket()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['food'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const logWaterMutation = useMutation({
    mutationFn: (ml: number) => logWater(ml),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['water'] }); },
  });

  const adjustMutation = useMutation({
    mutationFn: ({ id, multiplier }: { id: number; multiplier: number }) => adjustFoodEntry(id, multiplier),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['food'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setAdjustSheet(null); },
  });

  const burnMutation = useMutation({
    mutationFn: () => logBurnManual({
      date: today,
      total_kcal: +burnForm.total_kcal,
      active_kcal: burnForm.active_kcal ? +burnForm.active_kcal : 0,
      resting_kcal: 0,
      steps: burnForm.steps ? +burnForm.steps : 0,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['burn'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setShowBurnForm(false); setBurnForm({ total_kcal: '', active_kcal: '', steps: '' }); },
  });

  const quickAddMutation = useMutation({
    mutationFn: () => textLogFood(
      `Quick add: ${quickKcal} kcal${quickProtein ? `, ${quickProtein}g protein` : ''}`,
      getMealBucket()
    ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['food'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setActiveSheet('none');
      setQuickKcal(''); setQuickProtein(''); setQuickCarbs(''); setQuickFat('');
    },
  });

  const createCustomFoodMutation = useMutation({
    mutationFn: () => createCustomFood({
      name: cfName, brand: cfBrand || null, serving_desc: cfServing || null, serving_grams: null,
      kcal: +cfKcal, protein_g: +cfProtein, carbs_g: +cfCarbs, fat_g: +cfFat, fibre_g: 0,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom-foods'] });
      setActiveSheet('none');
      setCfName(''); setCfBrand(''); setCfServing(''); setCfKcal(''); setCfProtein(''); setCfCarbs(''); setCfFat('');
    },
  });

  const logCustomFoodMutation = useMutation({
    mutationFn: (food: CustomFood) => textLogFood(`${food.name}${food.brand ? ` (${food.brand})` : ''} - ${food.serving_desc ?? food.kcal + ' kcal'}`, getMealBucket()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['food'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); },
  });

  const weightMutation = useMutation({
    mutationFn: () => logWeight(+weightInput, today),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['weight'] }); setWeightInput(''); setActiveSheet('none'); },
  });

  const allEntries: FoodEntry[] = foodByBucket
    ? Object.values(foodByBucket as Record<string, FoodEntry[]>).flat()
    : [];
  const totalKcal = allEntries.reduce((s, e) => s + e.kcal, 0);
  const totalProtein = allEntries.reduce((s, e) => s + e.protein_g, 0);

  async function handleTextLog(e: React.FormEvent) {
    e.preventDefault();
    if (!textInput.trim()) return;
    setTextLoading(true);
    setTextResult(null);
    try {
      const query = encodeURIComponent(textInput.trim());
      const offResp = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${query}&json=1&page_size=5`);
      const offData = await offResp.json() as { products?: Array<{ product_name?: string; nutriments?: { 'energy-kcal_100g'?: number; proteins_100g?: number; carbohydrates_100g?: number; fat_100g?: number }; serving_size?: string }> };
      const best = offData.products?.find(p => p.product_name && p.nutriments?.['energy-kcal_100g']);
      if (best && best.nutriments) {
        const n = best.nutriments;
        setTextResult({
          description: best.product_name!,
          kcal: Math.round((n['energy-kcal_100g'] ?? 0)),
          protein_g: Math.round(n.proteins_100g ?? 0),
          carbs_g: Math.round(n.carbohydrates_100g ?? 0),
          fat_g: Math.round(n.fat_100g ?? 0),
        });
        setTextLoading(false);
        return;
      }
    } catch {
      // fall through to AI
    }
    try {
      const result = await textLogFood(textInput.trim(), getMealBucket());
      setTextResult({ description: result.description, kcal: result.kcal, protein_g: result.protein_g, carbs_g: result.carbs_g, fat_g: result.fat_g });
      qc.invalidateQueries({ queryKey: ['food'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setTextInput('');
      setActiveSheet('none');
    } catch {
      setTextResult({ description: textInput, kcal: 300, protein_g: 20, carbs_g: 30, fat_g: 10 });
    }
    setTextLoading(false);
  }

  async function handleConfirmOFF() {
    if (!textResult) return;
    setTextLoading(true);
    try {
      await textLogFood(`${textResult.description} (${textResult.kcal} kcal per 100g)`, getMealBucket());
      qc.invalidateQueries({ queryKey: ['food'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    } catch { }
    setTextResult(null);
    setTextInput('');
    setTextLoading(false);
    setActiveSheet('none');
  }

  async function handleSaveMeal() {
    if (mealComponents.length === 0) return;
    setMealSaving(true);
    try {
      let name = 'My Meal';
      try { name = await nameSavedMeal(mealComponents); } catch { }
      await createSavedMeal({ name, meal_bucket_hint: getMealBucket(), components: mealComponents });
      qc.invalidateQueries({ queryKey: ['saved-meals'] });
      setMealComponents([]);
      setActiveSheet('none');
    } catch { }
    setMealSaving(false);
  }

  function addMealComponent() {
    if (!mealCompInput.trim() || !mealCompKcal) return;
    setMealComponents(prev => [...prev, {
      description: mealCompInput.trim(),
      kcal: +mealCompKcal,
      protein_g: +mealCompProtein || 0,
      carbs_g: 0, fat_g: 0, fibre_g: 0,
      quantity: 1,
    }]);
    setMealCompInput(''); setMealCompKcal(''); setMealCompProtein('');
  }

  const latestWeight = weightEntries?.[weightEntries.length - 1];

  if (isLoading) return (
    <div className="p-4 space-y-4">
      <SkeletonCard className="h-24" />
      <SkeletonCard className="h-48" />
    </div>
  );

  return (
    <div className="px-4 pt-6 pb-28 space-y-4 max-w-xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-text-primary tracking-tight">Food Log</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveSheet('quick-add')}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-bg-elevated text-accent-energy border border-bg-border"
          >
            Quick Add
          </button>
          <a
            href="/api/export"
            download="food-log.csv"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-bg-elevated text-text-muted border border-bg-border"
          >
            Export
          </a>
        </div>
      </div>

      {/* Day summary */}
      <Card>
        <div className="flex justify-between">
          <div>
            <p className="text-text-muted text-xs uppercase tracking-wider mb-0.5">Total Intake</p>
            <p className="text-2xl font-black text-text-primary">{fmt(totalKcal)} <span className="text-text-muted text-base font-normal">kcal</span></p>
          </div>
          <div className="text-right">
            <p className="text-text-muted text-xs uppercase tracking-wider mb-0.5">Protein</p>
            <p className="text-2xl font-black text-accent-energy">{fmt(totalProtein)}<span className="text-text-muted text-base font-normal">g</span></p>
          </div>
        </div>
      </Card>

      {/* Recents + copy yesterday */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <CardLabel>Quick log</CardLabel>
          <button
            onClick={() => copyDayMutation.mutate()}
            disabled={copyDayMutation.isPending}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-bg-elevated text-accent-energy border border-bg-border disabled:opacity-50"
          >
            {copyDayMutation.isPending ? 'Copying...' : 'Copy from yesterday'}
          </button>
        </div>
        {recentFoods && recentFoods.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {recentFoods.slice(0, 5).map((f, i) => (
              <button
                key={i}
                onClick={() => logRecentMutation.mutate(f.description)}
                disabled={logRecentMutation.isPending}
                className="flex-shrink-0 px-3 py-2 rounded-xl bg-bg-elevated border border-bg-border text-left active:scale-95 transition-transform disabled:opacity-50"
              >
                <p className="text-text-primary text-xs font-medium max-w-[140px] truncate">{f.description}</p>
                <p className="text-text-muted text-[10px]">{Math.round(f.kcal)} kcal · {Math.round(f.protein_g)}g P</p>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-text-muted text-sm">No recent foods yet</p>
        )}
      </Card>

      {/* Text log input */}
      <Card>
        <CardLabel>Log Food by Text</CardLabel>
        <form onSubmit={handleTextLog} className="flex gap-2">
          <input
            value={textInput}
            onChange={e => setTextInput(e.target.value)}
            placeholder="e.g. two boiled eggs, 100g banana..."
            className="flex-1 bg-bg-elevated rounded-xl px-3 py-2 text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-accent-energy placeholder:text-text-muted"
          />
          <button
            type="submit"
            disabled={textLoading || !textInput.trim()}
            className="px-4 py-2 rounded-xl bg-accent-energy text-bg-base font-bold text-sm disabled:opacity-50 flex-shrink-0"
          >
            {textLoading ? '...' : 'Log'}
          </button>
        </form>
        {textResult && (
          <div className="mt-3 bg-bg-elevated rounded-xl p-3 space-y-2">
            <p className="text-text-primary text-sm font-semibold">{textResult.description}</p>
            <p className="text-text-muted text-xs">{textResult.kcal} kcal · P {textResult.protein_g}g · C {textResult.carbs_g}g · F {textResult.fat_g}g</p>
            <div className="flex gap-2">
              <button onClick={handleConfirmOFF} className="flex-1 py-2 rounded-lg bg-accent-energy text-bg-base font-bold text-xs">Confirm & Log</button>
              <button onClick={() => setTextResult(null)} className="flex-1 py-2 rounded-lg bg-bg-card text-text-muted text-xs">Dismiss</button>
            </div>
          </div>
        )}
      </Card>

      {/* Meal buckets */}
      {MEAL_ORDER.map(bucket => {
        const entries = (foodByBucket as Record<string, FoodEntry[]> | undefined)?.[bucket] ?? [];
        return (
          <Card key={bucket}>
            <CardLabel>{bucket}</CardLabel>
            {entries.length === 0 ? (
              <p className="text-text-muted text-sm">No entries</p>
            ) : (
              <div className="space-y-3">
                {entries.map(entry => (
                  <button
                    key={entry.id}
                    onClick={() => setAdjustSheet({ entry })}
                    className="w-full text-left bg-bg-elevated rounded-xl p-3 active:scale-[0.98] transition-transform"
                  >
                    <div className="flex justify-between items-start">
                      <p className="text-text-primary text-sm font-medium flex-1 pr-2 line-clamp-2">
                        {entry.description ?? 'Food entry'}
                        {entry.user_adjusted === 1 && <span className="ml-1 text-accent-amber text-xs">•adj</span>}
                      </p>
                      <p className="text-text-primary font-bold text-sm flex-shrink-0">{fmt(entry.kcal)} kcal</p>
                    </div>
                    <p className="text-text-muted text-xs mt-1">
                      P {fmt(entry.protein_g)}g · C {fmt(entry.carbs_g)}g · F {fmt(entry.fat_g)}g
                    </p>
                  </button>
                ))}
                <div className="flex justify-end text-xs text-text-muted pt-1 border-t border-bg-elevated">
                  {fmt(entries.reduce((s, e) => s + e.kcal, 0))} kcal · {fmt(entries.reduce((s, e) => s + e.protein_g, 0))}g protein
                </div>
              </div>
            )}
          </Card>
        );
      })}

      {/* Custom Foods */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <CardLabel>Custom Foods</CardLabel>
          <button
            onClick={() => setActiveSheet('custom-food-create')}
            className="text-accent-energy text-xs font-semibold"
          >
            + Create
          </button>
        </div>
        {!customFoods || customFoods.length === 0 ? (
          <p className="text-text-muted text-sm">No custom foods yet</p>
        ) : (
          <div className="space-y-2">
            {customFoods.map(food => (
              <div key={food.id} className="flex items-center justify-between bg-bg-elevated rounded-xl px-3 py-2">
                <div>
                  <p className="text-text-primary text-sm font-medium">{food.name}</p>
                  <p className="text-text-muted text-xs">{food.kcal} kcal · {food.serving_desc ?? `${food.protein_g}g P`}</p>
                </div>
                <button
                  onClick={() => logCustomFoodMutation.mutate(food)}
                  className="text-accent-energy text-xs font-semibold px-3 py-1.5 bg-bg-card rounded-lg"
                >
                  Log
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Saved Meals */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <CardLabel>Saved Meals</CardLabel>
          <button
            onClick={() => setActiveSheet('build-meal')}
            className="text-accent-energy text-xs font-semibold"
          >
            + Build
          </button>
        </div>
        {!savedMeals || savedMeals.length === 0 ? (
          <p className="text-text-muted text-sm">No saved meals yet</p>
        ) : (
          <div className="space-y-2">
            {savedMeals.map(meal => (
              <div key={meal.id} className="flex items-center justify-between bg-bg-elevated rounded-xl px-3 py-2">
                <div>
                  <p className="text-text-primary text-sm font-medium">{meal.name}</p>
                  <p className="text-text-muted text-xs">{Math.round(meal.total_kcal ?? 0)} kcal · {Math.round(meal.total_protein_g ?? 0)}g protein</p>
                </div>
                <button
                  onClick={() => {
                    const comps = meal.components ?? [];
                    comps.forEach(c => textLogFood(`${c.description} (saved meal: ${meal.name})`, getMealBucket()));
                    qc.invalidateQueries({ queryKey: ['food'] });
                    qc.invalidateQueries({ queryKey: ['dashboard'] });
                  }}
                  className="text-accent-energy text-xs font-semibold px-3 py-1.5 bg-bg-card rounded-lg"
                >
                  Log
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Water */}
      <Card>
        <CardLabel>Water</CardLabel>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-2xl font-black text-text-primary">
              {Math.round((waterData?.total_ml ?? 0) / 100) / 10}
              <span className="text-text-muted text-base font-normal ml-1">/ {(waterData?.goal_ml ?? 2500) / 1000}L</span>
            </p>
          </div>
          <p className={`text-sm font-semibold ${(waterData?.total_ml ?? 0) >= (waterData?.goal_ml ?? 2500) ? 'text-accent-green' : 'text-text-muted'}`}>
            {(waterData?.total_ml ?? 0) >= (waterData?.goal_ml ?? 2500) ? 'Goal reached!' : `${Math.round(((waterData?.goal_ml ?? 2500) - (waterData?.total_ml ?? 0)) / 100) / 10}L left`}
          </p>
        </div>
        <div className="flex gap-2">
          {[150, 250, 500, 750].map(ml => (
            <button
              key={ml}
              onClick={() => logWaterMutation.mutate(ml)}
              disabled={logWaterMutation.isPending}
              className="flex-1 py-2 rounded-xl bg-bg-elevated text-text-primary text-sm font-semibold border border-bg-border active:scale-95 transition-transform disabled:opacity-50"
            >
              +{ml}
            </button>
          ))}
        </div>
      </Card>

      {/* Weight */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <CardLabel>Weight</CardLabel>
          <button onClick={() => setActiveSheet('weight')} className="text-accent-energy text-xs font-semibold">+ Log</button>
        </div>
        {latestWeight ? (
          <div className="flex gap-4">
            <div>
              <p className="text-2xl font-black text-text-primary">{latestWeight.weight_kg}<span className="text-text-muted text-sm font-normal ml-1">kg</span></p>
              <p className="text-text-muted text-xs">Latest ({latestWeight.date})</p>
            </div>
            {latestWeight.smoothed_kg && (
              <div>
                <p className="text-2xl font-black text-accent-energy">{latestWeight.smoothed_kg}<span className="text-text-muted text-sm font-normal ml-1">kg</span></p>
                <p className="text-text-muted text-xs">Smoothed trend</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-text-muted text-sm">No weight entries yet</p>
        )}
      </Card>

      {/* Burn entry */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <CardLabel>Burn / Activity</CardLabel>
          <button
            onClick={() => setShowBurnForm(v => !v)}
            className="text-accent-energy text-xs font-semibold"
          >
            {showBurnForm ? 'Cancel' : '+ Manual'}
          </button>
        </div>
        {burnEntry ? (
          <div className="flex gap-4 text-sm">
            <div>
              <p className="text-text-muted text-xs">Total</p>
              <p className="font-bold text-text-primary">{fmt(burnEntry.total_kcal)} kcal</p>
            </div>
            <div>
              <p className="text-text-muted text-xs">Active</p>
              <p className="font-bold text-text-primary">{fmt(burnEntry.active_kcal)} kcal</p>
            </div>
            <div>
              <p className="text-text-muted text-xs">Steps</p>
              <p className="font-bold text-text-primary">{fmt(burnEntry.steps).toLocaleString()}</p>
            </div>
          </div>
        ) : (
          <p className="text-text-muted text-sm">No burn data for today</p>
        )}
        {showBurnForm && (
          <form
            onSubmit={e => { e.preventDefault(); burnMutation.mutate(); }}
            className="mt-3 space-y-3 border-t border-bg-elevated pt-3"
          >
            <div>
              <label className="text-text-muted text-xs block mb-1">Total kcal *</label>
              <input
                required type="number" min="0"
                value={burnForm.total_kcal}
                onChange={e => setBurnForm(f => ({ ...f, total_kcal: e.target.value }))}
                className="w-full bg-bg-elevated rounded-xl px-3 py-2 text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-accent-energy"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-text-muted text-xs block mb-1">Active kcal</label>
                <input
                  type="number" min="0"
                  value={burnForm.active_kcal}
                  onChange={e => setBurnForm(f => ({ ...f, active_kcal: e.target.value }))}
                  className="w-full bg-bg-elevated rounded-xl px-3 py-2 text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-accent-energy"
                />
              </div>
              <div className="flex-1">
                <label className="text-text-muted text-xs block mb-1">Steps</label>
                <input
                  type="number" min="0"
                  value={burnForm.steps}
                  onChange={e => setBurnForm(f => ({ ...f, steps: e.target.value }))}
                  className="w-full bg-bg-elevated rounded-xl px-3 py-2 text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-accent-energy"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={burnMutation.isPending}
              className="w-full py-2.5 rounded-xl bg-accent-energy text-bg-base font-bold text-sm disabled:opacity-50"
            >
              {burnMutation.isPending ? 'Saving...' : 'Log Burn'}
            </button>
          </form>
        )}
      </Card>

      {/* Adjust sheet */}
      {adjustSheet && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end" onClick={() => setAdjustSheet(null)}>
          <div className="w-full bg-bg-elevated rounded-t-3xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <p className="font-semibold text-text-primary">{adjustSheet.entry.description}</p>
            <p className="text-text-muted text-sm">{fmt(adjustSheet.entry.kcal)} kcal · {fmt(adjustSheet.entry.protein_g)}g P · {fmt(adjustSheet.entry.carbs_g)}g C · {fmt(adjustSheet.entry.fat_g)}g F</p>
            <p className="text-text-muted text-xs uppercase tracking-wider font-medium">Adjust Portion</p>
            <div className="grid grid-cols-4 gap-2">
              {MULTIPLIERS.map(m => (
                <button
                  key={m}
                  onClick={() => adjustMutation.mutate({ id: adjustSheet.entry.id, multiplier: m })}
                  disabled={adjustMutation.isPending}
                  className="py-3 rounded-xl bg-bg-card text-text-primary font-bold text-sm active:scale-95 transition-transform"
                >
                  ×{m}
                </button>
              ))}
            </div>
            <button onClick={() => setAdjustSheet(null)} className="w-full py-3 rounded-xl bg-bg-card text-text-muted text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Quick Add sheet */}
      {activeSheet === 'quick-add' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end" onClick={() => setActiveSheet('none')}>
          <div className="w-full bg-bg-elevated rounded-t-3xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <p className="font-bold text-text-primary text-lg">Quick Add</p>
            <div>
              <label className="text-text-muted text-xs block mb-1">Calories *</label>
              <input
                type="number" min="0" value={quickKcal}
                onChange={e => setQuickKcal(e.target.value)}
                placeholder="e.g. 400"
                className="w-full bg-bg-card rounded-xl px-3 py-2 text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-accent-energy"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Protein (g)', val: quickProtein, set: setQuickProtein },
                { label: 'Carbs (g)', val: quickCarbs, set: setQuickCarbs },
                { label: 'Fat (g)', val: quickFat, set: setQuickFat },
              ].map(({ label, val, set }) => (
                <div key={label}>
                  <label className="text-text-muted text-xs block mb-1">{label}</label>
                  <input
                    type="number" min="0" value={val}
                    onChange={e => set(e.target.value)}
                    className="w-full bg-bg-card rounded-xl px-3 py-2 text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-accent-energy"
                  />
                </div>
              ))}
            </div>
            <button
              onClick={() => quickKcal && quickAddMutation.mutate()}
              disabled={!quickKcal || quickAddMutation.isPending}
              className="w-full py-3 rounded-xl bg-accent-energy text-bg-base font-bold text-sm disabled:opacity-50"
            >
              {quickAddMutation.isPending ? 'Adding...' : 'Add'}
            </button>
            <button onClick={() => setActiveSheet('none')} className="w-full py-3 rounded-xl bg-bg-card text-text-muted text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Custom food create sheet */}
      {activeSheet === 'custom-food-create' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end" onClick={() => setActiveSheet('none')}>
          <div className="w-full bg-bg-elevated rounded-t-3xl p-6 space-y-3 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <p className="font-bold text-text-primary text-lg">Create Custom Food</p>
            {[
              { label: 'Name *', val: cfName, set: setCfName, placeholder: 'e.g. My Protein Bar' },
              { label: 'Brand', val: cfBrand, set: setCfBrand, placeholder: 'optional' },
              { label: 'Serving description', val: cfServing, set: setCfServing, placeholder: 'e.g. 1 bar (60g)' },
            ].map(({ label, val, set, placeholder }) => (
              <div key={label}>
                <label className="text-text-muted text-xs block mb-1">{label}</label>
                <input value={val} onChange={e => set(e.target.value)} placeholder={placeholder}
                  className="w-full bg-bg-card rounded-xl px-3 py-2 text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-accent-energy" />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Kcal *', val: cfKcal, set: setCfKcal },
                { label: 'Protein (g)', val: cfProtein, set: setCfProtein },
                { label: 'Carbs (g)', val: cfCarbs, set: setCfCarbs },
                { label: 'Fat (g)', val: cfFat, set: setCfFat },
              ].map(({ label, val, set }) => (
                <div key={label}>
                  <label className="text-text-muted text-xs block mb-1">{label}</label>
                  <input type="number" min="0" value={val} onChange={e => set(e.target.value)}
                    className="w-full bg-bg-card rounded-xl px-3 py-2 text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-accent-energy" />
                </div>
              ))}
            </div>
            <button
              onClick={() => cfName && cfKcal && createCustomFoodMutation.mutate()}
              disabled={!cfName || !cfKcal || createCustomFoodMutation.isPending}
              className="w-full py-3 rounded-xl bg-accent-energy text-bg-base font-bold text-sm disabled:opacity-50"
            >
              {createCustomFoodMutation.isPending ? 'Saving...' : 'Save Food'}
            </button>
            <button onClick={() => setActiveSheet('none')} className="w-full py-3 rounded-xl bg-bg-card text-text-muted text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Build Meal sheet */}
      {activeSheet === 'build-meal' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end" onClick={() => setActiveSheet('none')}>
          <div className="w-full bg-bg-elevated rounded-t-3xl p-6 space-y-3 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <p className="font-bold text-text-primary text-lg">Build Meal</p>
            {mealComponents.length > 0 && (
              <div className="space-y-2">
                {mealComponents.map((c, i) => (
                  <div key={i} className="flex items-center justify-between bg-bg-card rounded-xl px-3 py-2">
                    <div>
                      <p className="text-text-primary text-sm">{c.description}</p>
                      <p className="text-text-muted text-xs">{c.kcal} kcal · {c.protein_g}g P</p>
                    </div>
                    <button onClick={() => setMealComponents(prev => prev.filter((_, j) => j !== i))} className="text-accent-danger text-xs">Remove</button>
                  </div>
                ))}
                <p className="text-text-muted text-xs text-right">
                  Total: {mealComponents.reduce((s, c) => s + c.kcal, 0)} kcal · {mealComponents.reduce((s, c) => s + c.protein_g, 0)}g P
                </p>
              </div>
            )}
            <div className="bg-bg-card rounded-xl p-3 space-y-2">
              <p className="text-text-muted text-xs uppercase tracking-wider">Add Component</p>
              <input value={mealCompInput} onChange={e => setMealCompInput(e.target.value)} placeholder="Description"
                className="w-full bg-bg-elevated rounded-xl px-3 py-2 text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-accent-energy" />
              <div className="flex gap-2">
                <input type="number" min="0" value={mealCompKcal} onChange={e => setMealCompKcal(e.target.value)} placeholder="kcal"
                  className="flex-1 bg-bg-elevated rounded-xl px-3 py-2 text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-accent-energy" />
                <input type="number" min="0" value={mealCompProtein} onChange={e => setMealCompProtein(e.target.value)} placeholder="protein g"
                  className="flex-1 bg-bg-elevated rounded-xl px-3 py-2 text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-accent-energy" />
              </div>
              <button onClick={addMealComponent} disabled={!mealCompInput || !mealCompKcal}
                className="w-full py-2 rounded-xl bg-bg-elevated text-accent-energy font-semibold text-sm disabled:opacity-40">
                + Add Component
              </button>
            </div>
            <button
              onClick={handleSaveMeal}
              disabled={mealComponents.length === 0 || mealSaving}
              className="w-full py-3 rounded-xl bg-accent-energy text-bg-base font-bold text-sm disabled:opacity-50"
            >
              {mealSaving ? 'Saving...' : 'Save Meal'}
            </button>
            <button onClick={() => setActiveSheet('none')} className="w-full py-3 rounded-xl bg-bg-card text-text-muted text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Weight log sheet */}
      {activeSheet === 'weight' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end" onClick={() => setActiveSheet('none')}>
          <div className="w-full bg-bg-elevated rounded-t-3xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <p className="font-bold text-text-primary text-lg">Log Weight</p>
            <div>
              <label className="text-text-muted text-xs block mb-1">Weight (kg) *</label>
              <input
                type="number" step="0.1" min="0" value={weightInput}
                onChange={e => setWeightInput(e.target.value)}
                placeholder="e.g. 81.5"
                className="w-full bg-bg-card rounded-xl px-3 py-2 text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-accent-energy"
              />
            </div>
            <button
              onClick={() => weightInput && weightMutation.mutate()}
              disabled={!weightInput || weightMutation.isPending}
              className="w-full py-3 rounded-xl bg-accent-energy text-bg-base font-bold text-sm disabled:opacity-50"
            >
              {weightMutation.isPending ? 'Saving...' : 'Log Weight'}
            </button>
            <button onClick={() => setActiveSheet('none')} className="w-full py-3 rounded-xl bg-bg-card text-text-muted text-sm">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
