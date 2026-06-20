import { useQuery } from '@tanstack/react-query';
import { getDashboard, getWater, getTdee } from '../lib/api';
import { computeProjection } from '../lib/projection';
import { Ring } from '../components/ui/Ring';
import { MacroBar } from '../components/ui/MacroBar';
import { StatusPill } from '../components/ui/StatusPill';
import { SparkLine } from '../components/ui/SparkLine';
import { Card, CardLabel } from '../components/ui/Card';
import { SkeletonCard } from '../components/ui/SkeletonCard';
import { useNavigate } from 'react-router-dom';
import { Footprints, Heart, Flame, TrendingDown, Settings, Flame as FlameIcon, Activity } from 'lucide-react';

function fmt(n: number, digits = 0) { return n.toLocaleString('nl-NL', { maximumFractionDigits: digits }); }

const BUCKET_LABEL: Record<string, string> = {
  breakfast: 'Breakfast', lunch: 'Lunch', snack: 'Snack', dinner: 'Dinner', other: 'Other',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const todayDate = new Date().toISOString().slice(0, 10);
  const { data, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: getDashboard });
  const { data: waterData } = useQuery({ queryKey: ['water', todayDate], queryFn: () => getWater(todayDate) });
  const { data: tdeeData } = useQuery({ queryKey: ['tdee'], queryFn: getTdee });

  if (isLoading || !data) {
    return (
      <div className="px-4 pt-6 space-y-4">
        <SkeletonCard className="h-52" />
        <SkeletonCard className="h-32" />
        <SkeletonCard className="h-28" />
      </div>
    );
  }

  const { today, todayBurn, todayFood, latestInbody, activeGoal, rollups14, macroTargets } = data;
  const streakDays = data.streak_days ?? 0;

  // Energy balance ring
  const intakeKcal = today?.intake_kcal ?? 0;
  const burnKcal = todayBurn?.total_kcal ?? macroTargets.kcal;
  const balance = intakeKcal - burnKcal;
  const budgetRemaining = burnKcal - intakeKcal; // positive = can still eat
  // Ring value: 0 = all burned, 1 = fully eaten
  const energyRingValue = Math.min(1, intakeKcal / (burnKcal || 1));
  const energyColor = balance < -100 ? '#22C55E' : balance < 200 ? '#00E5FF' : '#EF4444';

  // Goal progress ring
  let goalRingValue = 0;
  let projection = null;
  if (latestInbody && activeGoal) {
    projection = computeProjection({
      latestInbody: {
        weight_kg: latestInbody.weight_kg ?? 82,
        bodyfat_pct: latestInbody.bodyfat_pct ?? 20,
        fat_mass_kg: latestInbody.fat_mass_kg ?? 16,
        lean_mass_kg: latestInbody.lean_mass_kg ?? 66,
        scan_date: latestInbody.scan_date,
      },
      goal: {
        target_bodyfat_pct: activeGoal.target_bodyfat_pct,
        target_weight_kg: activeGoal.target_weight_kg,
        target_lean_kg: activeGoal.target_lean_kg,
        target_date: activeGoal.target_date,
      },
      rollups: rollups14,
    });
    const startFat = latestInbody.fat_mass_kg ?? 16;
    const targetFat = activeGoal.target_bodyfat_pct
      ? (activeGoal.target_bodyfat_pct / 100) * (latestInbody.weight_kg ?? 82)
      : startFat * 0.7;
    const totalToLose = startFat - targetFat;
    const lostSoFar = projection.fatToChangeKg - (startFat - (latestInbody.fat_mass_kg ?? startFat));
    goalRingValue = totalToLose > 0 ? Math.max(0, Math.min(1, lostSoFar / totalToLose)) : 0;
    // rough progress: days elapsed / total days
    const totalDays = projection.daysUntilGoal + Math.max(0, rollups14.length);
    const elapsed = Math.max(0, rollups14.length);
    goalRingValue = totalDays > 0 ? elapsed / totalDays : 0;
  }

  // Meals grouped by bucket
  const byBucket: Record<string, typeof todayFood> = {};
  for (const f of todayFood) {
    if (!byBucket[f.meal_bucket]) byBucket[f.meal_bucket] = [];
    byBucket[f.meal_bucket].push(f);
  }

  const sparkData = rollups14.map(r => ({ value: r.total_kcal ?? r.burn_kcal }));
  const waterMl = waterData?.total_ml ?? 0;
  const waterGoal = waterData?.goal_ml ?? 2500;
  const waterRingValue = Math.min(1, waterMl / waterGoal);

  return (
    <div className="px-4 pt-6 pb-4 space-y-4 animate-fade-in max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-primary tracking-tight">Recomp OS</h1>
        <div className="flex items-center gap-2">
          {streakDays > 0 && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-elevated border border-border">
              <FlameIcon size={14} className="text-amber" />
              <span className="text-primary text-xs font-bold">{streakDays}d</span>
            </div>
          )}
          <button
            onClick={() => navigate('/settings')}
            className="p-2 rounded-full bg-elevated border border-border text-muted hover:text-primary transition-colors"
            aria-label="Settings"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* Hero — three rings */}
      <Card className="flex items-center justify-around py-6 flex-wrap gap-4">
        <Ring
          value={energyRingValue}
          size={120}
          color={energyColor}
          label="Energy Balance"
          centerText={balance <= 0 ? `−${fmt(Math.abs(balance))}` : `+${fmt(balance)}`}
          subText="kcal"
        />
        <Ring
          value={goalRingValue}
          size={120}
          color="#A855F7"
          label="Goal Progress"
          centerText={`${Math.round(goalRingValue * 100)}%`}
          subText="to target"
        />
        <Ring
          value={waterRingValue}
          size={120}
          color="#22C55E"
          label="Hydration"
          centerText={`${Math.round(waterMl / 100) / 10}L`}
          subText={`/ ${waterGoal / 1000}L`}
        />
      </Card>

      {/* Macros card */}
      <Card>
        <CardLabel>Today's nutrition</CardLabel>
        <div className="flex justify-between items-end mb-4">
          <div>
            <span className="text-4xl font-black tracking-tighter-nums text-primary">{fmt(intakeKcal)}</span>
            <span className="text-muted text-sm ml-1">/ {fmt(macroTargets.kcal)} kcal</span>
          </div>
          <span className={`text-sm font-semibold ${budgetRemaining >= 0 ? 'text-green' : 'text-danger'}`}>
            {budgetRemaining >= 0 ? `${fmt(budgetRemaining)} left` : `${fmt(Math.abs(budgetRemaining))} over`}
          </span>
        </div>
        <div className="space-y-3">
          <MacroBar label="Protein" current={todayFood.reduce((s,f)=>s+f.protein_g,0)} target={macroTargets.protein_g} color="#A855F7" />
          <MacroBar label="Carbs"   current={todayFood.reduce((s,f)=>s+f.carbs_g,0)}   target={macroTargets.carbs_g}   color="#F59E0B" />
          <MacroBar label="Fat"     current={todayFood.reduce((s,f)=>s+f.fat_g,0)}     target={macroTargets.fat_g}     color="#EF4444" />
        </div>
      </Card>

      {/* Burn card */}
      {todayBurn && (
        <Card>
          <CardLabel>Daily burn</CardLabel>
          <div className="flex items-end justify-between mb-3">
            <div>
              <span className="text-4xl font-black tracking-tighter-nums text-primary">{fmt(todayBurn.total_kcal)}</span>
              <span className="text-muted text-sm ml-1">kcal</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { icon: Flame,     val: `${fmt(todayBurn.active_kcal)}`, label: 'Active' },
              { icon: Footprints,val: `${fmt(todayBurn.steps)}`,       label: 'Steps' },
              { icon: Heart,     val: todayBurn.resting_hr ? `${todayBurn.resting_hr}bpm` : '—', label: 'Resting HR' },
            ].map(({ icon: Icon, val, label }) => (
              <div key={label} className="bg-elevated rounded-xl p-3 text-center">
                <Icon size={14} className="mx-auto mb-1 text-muted" />
                <p className="text-primary font-bold text-sm tracking-tighter-nums">{val}</p>
                <p className="text-muted text-[10px] uppercase tracking-wider">{label}</p>
              </div>
            ))}
          </div>
          <SparkLine data={sparkData} color="#00E5FF" height={36} />
        </Card>
      )}

      {/* Adaptive TDEE card */}
      {tdeeData?.tdee != null && (
        <Card className="flex items-center justify-between">
          <div>
            <CardLabel>Est. TDEE</CardLabel>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black tracking-tighter-nums text-primary">{fmt(tdeeData.tdee)}</span>
              <span className="text-muted text-sm">kcal/day</span>
            </div>
            <p className="text-muted text-xs mt-0.5">
              {tdeeData.stable
                ? 'Weight stable — eating at maintenance'
                : `From ${tdeeData.window_days}d of intake + weight`}
            </p>
          </div>
          <div className="w-11 h-11 rounded-full bg-elevated flex items-center justify-center">
            <Activity size={18} className="text-energy" />
          </div>
        </Card>
      )}

      {/* Projection card */}
      {projection && activeGoal && (
        <Card onClick={() => navigate('/goals')}>
          <CardLabel>Projection</CardLabel>
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-2xl font-black tracking-tight text-primary">
                {projection.projectedDate
                  ? new Date(projection.projectedDate).toLocaleDateString('nl-NL', { day:'numeric', month:'short', year:'numeric' })
                  : '—'}
              </p>
              <p className="text-muted text-xs mt-0.5">Projected goal date</p>
            </div>
            <StatusPill status={projection.status} />
          </div>
          <div className="flex gap-4 text-sm">
            <div>
              <p className="text-muted text-xs uppercase tracking-wider">Required deficit</p>
              <p className="text-primary font-semibold">{fmt(Math.abs(projection.requiredDailyBalance))} kcal/day</p>
            </div>
            <div>
              <p className="text-muted text-xs uppercase tracking-wider">7-day avg</p>
              <p className={`font-semibold ${projection.trailingAvg7 < 0 ? 'text-green' : 'text-danger'}`}>
                {projection.trailingAvg7 < 0 ? '' : '+'}{fmt(projection.trailingAvg7)} kcal
              </p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
            <TrendingDown size={14} className="text-muted flex-shrink-0" />
            <p className="text-muted text-xs">
              {projection.status === 'BEHIND'
                ? `You need to cut ${fmt(Math.abs(projection.statusDeltaKcal))} more kcal/day to stay on track.`
                : projection.status === 'AHEAD'
                ? `You're ahead by ${fmt(Math.abs(projection.statusDeltaKcal))} kcal/day — great momentum.`
                : 'You\'re right on target. Keep going.'}
            </p>
          </div>
        </Card>
      )}

      {/* Today's meals */}
      {Object.keys(byBucket).length > 0 && (
        <div>
          <CardLabel>Today's meals</CardLabel>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            {Object.entries(byBucket).map(([bucket, entries]) => {
              const totalKcal = entries.reduce((s, e) => s + e.kcal, 0);
              const totalProt = entries.reduce((s, e) => s + e.protein_g, 0);
              return (
                <div key={bucket} className="bg-card rounded-2xl p-3 min-w-[140px] flex-shrink-0 border border-border">
                  <p className="text-[10px] uppercase tracking-widest text-muted mb-1">{BUCKET_LABEL[bucket]}</p>
                  <p className="text-primary font-bold">{fmt(totalKcal)} kcal</p>
                  <p className="text-muted text-xs">{fmt(totalProt)}g protein</p>
                  {entries[0]?.description && (
                    <p className="text-dim text-xs mt-1 line-clamp-2">{entries[0].description}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Water card */}
      <Card>
        <CardLabel>Water intake</CardLabel>
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-3xl font-black tracking-tighter-nums text-primary">{Math.round(waterMl / 100) / 10}</span>
            <span className="text-muted text-sm ml-1">/ {waterGoal / 1000} L</span>
          </div>
          <span className={`text-sm font-semibold ${waterMl >= waterGoal ? 'text-green' : 'text-muted'}`}>
            {waterMl >= waterGoal ? 'Goal reached!' : `${Math.round((waterGoal - waterMl) / 100) / 10}L left`}
          </span>
        </div>
        <div className="flex gap-2">
          {[150, 250, 500].map(ml => (
            <button
              key={ml}
              onClick={() => navigate('/log')}
              className="flex-1 py-2 rounded-xl bg-elevated text-primary text-sm font-semibold border border-border hover:border-green transition-colors"
            >
              +{ml}ml
            </button>
          ))}
        </div>
      </Card>

      {/* Trends teaser */}
      <Card onClick={() => navigate('/trends')} className="flex items-center justify-between">
        <div>
          <CardLabel>Body composition</CardLabel>
          {latestInbody && (
            <div className="flex gap-4">
              <div>
                <p className="text-2xl font-black tracking-tighter-nums text-primary">{latestInbody.bodyfat_pct?.toFixed(1)}%</p>
                <p className="text-muted text-xs">Body fat</p>
              </div>
              <div>
                <p className="text-2xl font-black tracking-tighter-nums text-primary">{latestInbody.weight_kg?.toFixed(1)}</p>
                <p className="text-muted text-xs">kg</p>
              </div>
              <div>
                <p className="text-2xl font-black tracking-tighter-nums text-primary">{latestInbody.skeletal_muscle_kg?.toFixed(1)}</p>
                <p className="text-muted text-xs">kg muscle</p>
              </div>
            </div>
          )}
        </div>
        <span className="text-muted text-xl">›</span>
      </Card>
    </div>
  );
}
