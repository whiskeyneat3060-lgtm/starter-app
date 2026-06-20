import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProfile, updateProfile, setWaterGoal } from '../lib/api';
import { Card, CardLabel } from '../components/ui/Card';
import { SkeletonCard } from '../components/ui/SkeletonCard';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export default function Settings() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['profile'], queryFn: getProfile });

  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [water, setWater] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) {
      setKcal(String(data.target_kcal));
      setProtein(String(data.target_protein_g));
      setCarbs(String(data.target_carbs_g));
      setFat(String(data.target_fat_g));
      setWater(String(data.water_goal_ml));
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await updateProfile({
        target_kcal: +kcal,
        target_protein_g: +protein,
        target_carbs_g: +carbs,
        target_fat_g: +fat,
      });
      await setWaterGoal(+water);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['water'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  // Live macro-math check: protein*4 + carbs*4 + fat*9 vs kcal target.
  const macroKcal = (+protein || 0) * 4 + (+carbs || 0) * 4 + (+fat || 0) * 9;
  const kcalTarget = +kcal || 0;
  const macroDelta = macroKcal - kcalTarget;

  if (isLoading) {
    return (
      <div className="px-4 pt-6 space-y-4 max-w-lg mx-auto">
        <SkeletonCard className="h-12" />
        <SkeletonCard className="h-64" />
      </div>
    );
  }

  const field = (label: string, val: string, set: (v: string) => void, unit: string) => (
    <div>
      <label className="text-muted text-xs block mb-1">{label}</label>
      <div className="flex items-center bg-elevated rounded-xl px-3">
        <input
          type="number" min="0" value={val} onChange={e => set(e.target.value)}
          className="flex-1 bg-transparent py-2 text-primary text-sm focus:outline-none"
        />
        <span className="text-muted text-xs">{unit}</span>
      </div>
    </div>
  );

  return (
    <div className="px-4 pt-6 pb-28 space-y-4 max-w-lg mx-auto animate-fade-in">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate('/')} className="text-muted p-1 -ml-1" aria-label="Back">
          <ChevronLeft size={22} />
        </button>
        <h1 className="text-xl font-black text-primary tracking-tight">Settings</h1>
      </div>

      <Card>
        <CardLabel>Daily macro targets</CardLabel>
        <div className="space-y-3 mt-2">
          {field('Calories', kcal, setKcal, 'kcal')}
          <div className="grid grid-cols-3 gap-3">
            {field('Protein', protein, setProtein, 'g')}
            {field('Carbs', carbs, setCarbs, 'g')}
            {field('Fat', fat, setFat, 'g')}
          </div>
          <div className={`text-xs rounded-lg px-3 py-2 ${Math.abs(macroDelta) <= 50 ? 'text-green bg-elevated' : 'text-amber bg-elevated'}`}>
            Macros add up to <span className="font-semibold">{macroKcal} kcal</span>
            {Math.abs(macroDelta) <= 50
              ? ' — matches your calorie target.'
              : ` — ${macroDelta > 0 ? 'over' : 'under'} target by ${Math.abs(macroDelta)} kcal.`}
          </div>
        </div>
      </Card>

      <Card>
        <CardLabel>Hydration goal</CardLabel>
        <div className="mt-2">{field('Daily water goal', water, setWater, 'ml')}</div>
      </Card>

      <button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        className="w-full py-3 rounded-xl bg-energy text-[#0A0A0C] font-bold text-sm disabled:opacity-50"
      >
        {saveMutation.isPending ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
      </button>
    </div>
  );
}
