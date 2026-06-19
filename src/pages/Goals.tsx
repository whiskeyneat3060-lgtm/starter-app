import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getActiveGoal, saveGoal } from '../lib/api';
import { Card, CardLabel } from '../components/ui/Card';
import { SkeletonCard } from '../components/ui/SkeletonCard';
import type { Goal } from '../types';

function fmt(n: number | null | undefined, suffix = '') {
  if (n == null) return '—';
  return `${n}${suffix}`;
}

export default function Goals() {
  const qc = useQueryClient();
  const { data: goal, isLoading } = useQuery({ queryKey: ['goal'], queryFn: getActiveGoal });

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Goal>>({});
  const [saved, setSaved] = useState(false);

  const mutation = useMutation({
    mutationFn: saveGoal,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goal'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  function startEdit() {
    setForm({
      target_bodyfat_pct: goal?.target_bodyfat_pct ?? undefined,
      target_weight_kg: goal?.target_weight_kg ?? undefined,
      target_lean_kg: goal?.target_lean_kg ?? undefined,
      target_date: goal?.target_date ?? '2026-09-01',
    });
    setEditing(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.target_date) return;
    mutation.mutate(form);
  }

  if (isLoading) return <div className="p-4 space-y-4"><SkeletonCard className="h-40" /><SkeletonCard className="h-32" /></div>;

  return (
    <div className="px-4 pt-6 pb-4 space-y-4 max-w-xl mx-auto">
      <h1 className="text-xl font-black text-text-primary tracking-tight">Goals</h1>

      {saved && (
        <div className="bg-accent-green/20 text-accent-green text-sm text-center rounded-xl py-2 font-medium">
          Goal saved!
        </div>
      )}

      {goal && !editing ? (
        <Card>
          <CardLabel>Active Goal</CardLabel>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-text-muted text-xs mb-0.5">Target Body Fat</p>
              <p className="text-text-primary font-bold text-xl">{fmt(goal.target_bodyfat_pct, '%')}</p>
            </div>
            <div>
              <p className="text-text-muted text-xs mb-0.5">Target Weight</p>
              <p className="text-text-primary font-bold text-xl">{fmt(goal.target_weight_kg, ' kg')}</p>
            </div>
            <div>
              <p className="text-text-muted text-xs mb-0.5">Target Lean Mass</p>
              <p className="text-text-primary font-bold text-xl">{fmt(goal.target_lean_kg, ' kg')}</p>
            </div>
            <div>
              <p className="text-text-muted text-xs mb-0.5">Target Date</p>
              <p className="text-text-primary font-bold text-xl">
                {new Date(goal.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>
          <button
            onClick={startEdit}
            className="w-full py-3 rounded-xl bg-accent-energy/20 text-accent-energy font-semibold text-sm"
          >
            Edit Goal
          </button>
        </Card>
      ) : (
        <Card>
          <CardLabel>{goal ? 'Edit Goal' : 'Set Goal'}</CardLabel>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-text-muted text-xs uppercase tracking-wider font-medium block mb-1">
                Target Body Fat %
              </label>
              <input
                type="number"
                step="0.1"
                min="5"
                max="35"
                value={form.target_bodyfat_pct ?? ''}
                onChange={e => setForm(f => ({ ...f, target_bodyfat_pct: e.target.value ? +e.target.value : undefined }))}
                placeholder="e.g. 12"
                className="w-full bg-bg-elevated rounded-xl px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-energy"
              />
            </div>
            <div>
              <label className="text-text-muted text-xs uppercase tracking-wider font-medium block mb-1">
                Target Weight (kg)
              </label>
              <input
                type="number"
                step="0.1"
                min="40"
                max="200"
                value={form.target_weight_kg ?? ''}
                onChange={e => setForm(f => ({ ...f, target_weight_kg: e.target.value ? +e.target.value : undefined }))}
                placeholder="e.g. 75"
                className="w-full bg-bg-elevated rounded-xl px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-energy"
              />
            </div>
            <div>
              <label className="text-text-muted text-xs uppercase tracking-wider font-medium block mb-1">
                Target Lean Mass (kg)
              </label>
              <input
                type="number"
                step="0.1"
                min="30"
                max="120"
                value={form.target_lean_kg ?? ''}
                onChange={e => setForm(f => ({ ...f, target_lean_kg: e.target.value ? +e.target.value : undefined }))}
                placeholder="e.g. 66"
                className="w-full bg-bg-elevated rounded-xl px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-energy"
              />
            </div>
            <div>
              <label className="text-text-muted text-xs uppercase tracking-wider font-medium block mb-1">
                Target Date *
              </label>
              <input
                type="date"
                required
                value={form.target_date ?? ''}
                onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))}
                className="w-full bg-bg-elevated rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-energy"
              />
            </div>

            <div className="flex gap-3">
              {editing && (
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="flex-1 py-3 rounded-xl bg-bg-elevated text-text-muted font-semibold text-sm"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={mutation.isPending}
                className="flex-1 py-3 rounded-xl bg-accent-energy text-bg-base font-bold text-sm disabled:opacity-50"
              >
                {mutation.isPending ? 'Saving...' : 'Save Goal'}
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Fat/Lean partition info */}
      <Card>
        <CardLabel>Body Recomp Assumptions</CardLabel>
        <div className="space-y-2 text-sm text-text-muted">
          <p>In a caloric deficit, fat loss is estimated at <span className="text-text-primary font-semibold">85%</span> of the total energy deficit.</p>
          <p>Rate: <span className="text-text-primary font-semibold">7,700 kcal = 1 kg fat</span></p>
          <p>Projections update as new data arrives from Garmin and food logs.</p>
        </div>
      </Card>
    </div>
  );
}
