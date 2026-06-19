import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFoodEntries, adjustFoodEntry, logBurnManual, getBurnEntry } from '../lib/api';
import { Card, CardLabel } from '../components/ui/Card';
import { SkeletonCard } from '../components/ui/SkeletonCard';
import type { FoodEntry } from '../types';

const MEAL_ORDER = ['breakfast', 'lunch', 'snack', 'dinner'] as const;
const MULTIPLIERS = [0.5, 1, 1.5, 2] as const;

function fmt(n: number) { return Math.round(n); }

interface AdjustSheet {
  entry: FoodEntry;
}

export default function Log() {
  const today = new Date().toISOString().slice(0, 10);
  const qc = useQueryClient();
  const [adjustSheet, setAdjustSheet] = useState<AdjustSheet | null>(null);
  const [showBurnForm, setShowBurnForm] = useState(false);
  const [burnForm, setBurnForm] = useState({ total_kcal: '', active_kcal: '', steps: '' });

  const { data: foodByBucket, isLoading } = useQuery({
    queryKey: ['food', today],
    queryFn: () => getFoodEntries(today),
  });

  const { data: burnEntry } = useQuery({
    queryKey: ['burn', today],
    queryFn: () => getBurnEntry(today),
  });

  const adjustMutation = useMutation({
    mutationFn: ({ id, multiplier }: { id: number; multiplier: number }) =>
      adjustFoodEntry(id, multiplier),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['food'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setAdjustSheet(null);
    },
  });

  const burnMutation = useMutation({
    mutationFn: () => logBurnManual({
      date: today,
      total_kcal: +burnForm.total_kcal,
      active_kcal: burnForm.active_kcal ? +burnForm.active_kcal : 0,
      resting_kcal: 0,
      steps: burnForm.steps ? +burnForm.steps : 0,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['burn'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setShowBurnForm(false);
      setBurnForm({ total_kcal: '', active_kcal: '', steps: '' });
    },
  });

  const allEntries: FoodEntry[] = foodByBucket
    ? Object.values(foodByBucket as Record<string, FoodEntry[]>).flat()
    : [];

  const totalKcal = allEntries.reduce((s, e) => s + e.kcal, 0);
  const totalProtein = allEntries.reduce((s, e) => s + e.protein_g, 0);

  if (isLoading) return (
    <div className="p-4 space-y-4">
      <SkeletonCard className="h-24" />
      <SkeletonCard className="h-48" />
    </div>
  );

  return (
    <div className="px-4 pt-6 pb-4 space-y-4 max-w-xl mx-auto">
      <h1 className="text-xl font-black text-text-primary tracking-tight">Food Log</h1>

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
          <div
            className="w-full bg-bg-elevated rounded-t-3xl p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
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
    </div>
  );
}
