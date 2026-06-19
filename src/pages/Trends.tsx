import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTrends, getWeightEntries } from '../lib/api';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot,
} from 'recharts';
import { Card, CardLabel } from '../components/ui/Card';
import { SkeletonCard } from '../components/ui/SkeletonCard';

type Range = '30d' | '90d' | '6mo';

function fmt(n: number, d = 0) { return n.toLocaleString('nl-NL', { maximumFractionDigits: d }); }

const TOOLTIP_STYLE = {
  contentStyle: { background: '#141417', border: '1px solid #252529', borderRadius: 12, fontSize: 12 },
  labelStyle: { color: '#6B7280', fontSize: 11 },
};

export default function Trends() {
  const [range, setRange] = useState<Range>('30d');
  const { data, isLoading } = useQuery({ queryKey: ['trends', range], queryFn: () => getTrends(range) });
  const { data: weightEntries } = useQuery({ queryKey: ['weight', 30], queryFn: () => getWeightEntries(30) });

  if (isLoading || !data) {
    return (
      <div className="px-4 pt-6 space-y-4">
        {[...Array(4)].map((_, i) => <SkeletonCard key={i} className="h-40" />)}
      </div>
    );
  }

  const { rollups, scans } = data;

  // Merge scan dates into rollup data for reference dots
  const scanMap = new Map(scans.map(s => [s.scan_date, s]));

  const bfData = scans.map(s => ({
    date: s.scan_date,
    bf: s.bodyfat_pct,
    weight: s.weight_kg,
    lean: s.lean_mass_kg,
  }));

  const balanceData = rollups.map(r => ({
    date: r.date.slice(5),
    balance: r.balance_kcal,
    intake: r.intake_kcal,
    burn: r.burn_kcal,
  }));

  const weeklyData: { week: string; balance: number }[] = [];
  for (let i = 0; i < rollups.length; i += 7) {
    const slice = rollups.slice(i, i + 7);
    const avg = slice.reduce((s, r) => s + r.balance_kcal, 0) / slice.length;
    weeklyData.push({ week: slice[0].date.slice(5), balance: Math.round(avg) });
  }

  return (
    <div className="px-4 pt-6 pb-4 space-y-4 max-w-lg mx-auto animate-fade-in">
      {/* Range selector */}
      <div className="flex gap-2 bg-card rounded-xl p-1">
        {(['30d', '90d', '6mo'] as Range[]).map(r => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${range === r ? 'bg-elevated text-primary' : 'text-muted'}`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Body fat % */}
      {bfData.length > 0 && (
        <Card>
          <CardLabel>Body fat %</CardLabel>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={bfData} margin={{ left: -20, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#252529" />
              <XAxis dataKey="date" tick={{ fill: '#6B7280', fontSize: 10 }} />
              <YAxis domain={['auto', 'auto']} tick={{ fill: '#6B7280', fontSize: 10 }} unit="%" />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [`${v?.toFixed(1)}%`, 'Body fat']} />
              <Line type="monotone" dataKey="bf" stroke="#A855F7" strokeWidth={2.5} dot={{ fill: '#A855F7', r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Weight */}
      {bfData.length > 0 && (
        <Card>
          <CardLabel>Weight (kg)</CardLabel>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={bfData} margin={{ left: -20, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#252529" />
              <XAxis dataKey="date" tick={{ fill: '#6B7280', fontSize: 10 }} />
              <YAxis domain={['auto', 'auto']} tick={{ fill: '#6B7280', fontSize: 10 }} unit="kg" />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [`${v?.toFixed(1)} kg`, 'Weight']} />
              <Line type="monotone" dataKey="weight" stroke="#00E5FF" strokeWidth={2.5} dot={{ fill: '#00E5FF', r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Weekly balance bars */}
      <Card>
        <CardLabel>Weekly avg energy balance</CardLabel>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={weeklyData} margin={{ left: -20, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#252529" />
            <XAxis dataKey="week" tick={{ fill: '#6B7280', fontSize: 10 }} />
            <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} />
            <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [`${v > 0 ? '+' : ''}${fmt(v)} kcal`, 'Balance']} />
            <Bar dataKey="balance" radius={[4,4,0,0]}
              fill="#22C55E"
              label={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Weight trend */}
      {weightEntries && weightEntries.length > 0 && (
        <Card>
          <CardLabel>Weight trend (smoothed EWMA)</CardLabel>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={weightEntries} margin={{ left: -20, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#252529" />
              <XAxis dataKey="date" tick={{ fill: '#6B7280', fontSize: 10 }} tickFormatter={d => d.slice(5)} />
              <YAxis domain={['auto', 'auto']} tick={{ fill: '#6B7280', fontSize: 10 }} unit="kg" />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [`${v?.toFixed(1)} kg`]} />
              <Line type="monotone" dataKey="weight_kg" stroke="#6B7280" strokeWidth={1} dot={false} name="Actual" strokeDasharray="4 2" />
              <Line type="monotone" dataKey="smoothed_kg" stroke="#00E5FF" strokeWidth={2.5} dot={false} name="Smoothed" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Intake vs burn area */}
      <Card>
        <CardLabel>Intake vs burn</CardLabel>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={balanceData} margin={{ left: -20, right: 8 }}>
            <defs>
              <linearGradient id="intakeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#A855F7" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#A855F7" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="burnGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00E5FF" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#252529" />
            <XAxis dataKey="date" tick={{ fill: '#6B7280', fontSize: 10 }} />
            <YAxis domain={['auto', 'auto']} tick={{ fill: '#6B7280', fontSize: 10 }} />
            <Tooltip {...TOOLTIP_STYLE} />
            <Area type="monotone" dataKey="burn" stroke="#00E5FF" fill="url(#burnGrad)" strokeWidth={2} name="Burn" />
            <Area type="monotone" dataKey="intake" stroke="#A855F7" fill="url(#intakeGrad)" strokeWidth={2} name="Intake" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
