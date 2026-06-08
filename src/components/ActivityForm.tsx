import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Activity, Frequency } from '../types';
import { WEEKDAY_LABELS } from '../utils/schedule';

type FormData = Omit<Activity, 'id' | 'createdAt'>;

interface Props {
  initial?: Activity;
  onSave: (data: FormData) => void;
  onDelete?: () => void;
  onClose: () => void;
}

const DURATION_CHIPS = [15, 30, 45, 60];

function defaultForm(initial?: Activity): FormData & { customDur: string } {
  return {
    name: initial?.name ?? '',
    duration: initial?.duration ?? 30,
    frequency: initial?.frequency ?? 'daily',
    weekdays: initial?.weekdays ?? [],
    startTime: initial?.startTime ?? '08:00',
    rewardTarget: initial?.rewardTarget ?? 7,
    rewardText: initial?.rewardText ?? '',
    customDur: DURATION_CHIPS.includes(initial?.duration ?? 30) ? '' : String(initial?.duration ?? ''),
  };
}

export default function ActivityForm({ initial, onSave, onDelete, onClose }: Props) {
  const [f, setF] = useState(defaultForm(initial));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isCustomDur = !DURATION_CHIPS.includes(f.duration);

  function set<K extends keyof typeof f>(key: K, value: (typeof f)[K]) {
    setF(prev => ({ ...prev, [key]: value }));
  }

  function toggleWeekday(d: number) {
    setF(prev => ({
      ...prev,
      weekdays: prev.weekdays.includes(d)
        ? prev.weekdays.filter(x => x !== d)
        : [...prev.weekdays, d].sort(),
    }));
  }

  function handleDurationChip(d: number) {
    setF(prev => ({ ...prev, duration: d, customDur: '' }));
  }

  function handleCustomDur(val: string) {
    const n = parseInt(val, 10);
    setF(prev => ({
      ...prev,
      customDur: val,
      duration: !isNaN(n) && n > 0 ? n : prev.duration,
    }));
  }

  function handleSubmit() {
    if (!f.name.trim()) return;
    if (f.frequency === 'weekdays' && f.weekdays.length === 0) return;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { customDur, ...data } = f;
    onSave(data);
  }

  const valid = f.name.trim().length > 0 &&
    (f.frequency !== 'weekdays' || f.weekdays.length > 0) &&
    f.rewardText.trim().length > 0;

  return (
    <motion.div
      className="fixed inset-0 z-30 flex items-end"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        className="relative w-full bg-gray-900 rounded-t-3xl max-h-[92vh] overflow-y-auto"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 32, stiffness: 300 }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-700 rounded-full" />
        </div>

        <div className="px-6 pt-2 pb-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">{initial ? 'Edit activity' : 'New activity'}</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors text-2xl leading-none">×</button>
          </div>

          {/* Name */}
          <label className="block mb-5">
            <span className="text-xs font-semibold text-gray-400 tracking-wider uppercase">Name</span>
            <input
              type="text"
              value={f.name}
              onChange={e => set('name', e.target.value)}
              placeholder="e.g. Study Dutch"
              className="mt-2 w-full bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </label>

          {/* Duration */}
          <div className="mb-5">
            <span className="text-xs font-semibold text-gray-400 tracking-wider uppercase">Duration</span>
            <div className="flex gap-2 mt-2 flex-wrap">
              {DURATION_CHIPS.map(d => (
                <button
                  key={d}
                  onClick={() => handleDurationChip(d)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    f.duration === d && !isCustomDur
                      ? 'bg-amber-500 text-gray-950'
                      : 'bg-gray-800 text-gray-300'
                  }`}
                >
                  {d} min
                </button>
              ))}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${isCustomDur ? 'bg-amber-500/20 border border-amber-500' : 'bg-gray-800'}`}>
                <input
                  type="number"
                  min={1}
                  max={300}
                  value={f.customDur}
                  onChange={e => handleCustomDur(e.target.value)}
                  placeholder="Custom"
                  className="bg-transparent w-16 text-white placeholder:text-gray-600 focus:outline-none text-sm"
                />
                <span className="text-gray-400 text-xs">min</span>
              </div>
            </div>
          </div>

          {/* Frequency */}
          <div className="mb-5">
            <span className="text-xs font-semibold text-gray-400 tracking-wider uppercase">Frequency</span>
            <div className="mt-2 space-y-2">
              {(['daily', 'alternate', 'weekdays'] as Frequency[]).map(freq => (
                <button
                  key={freq}
                  onClick={() => set('frequency', freq)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm transition-colors ${
                    f.frequency === freq ? 'bg-amber-500/15 border border-amber-500/40 text-white' : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                    f.frequency === freq ? 'border-amber-400 bg-amber-400' : 'border-gray-600'
                  }`} />
                  {freq === 'daily' && 'Every day'}
                  {freq === 'alternate' && 'Every other day'}
                  {freq === 'weekdays' && 'Specific days'}
                </button>
              ))}
            </div>

            {/* Weekday selector */}
            <AnimatePresence>
              {f.frequency === 'weekdays' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex gap-2 mt-3 justify-between">
                    {WEEKDAY_LABELS.map((lbl, idx) => (
                      <button
                        key={idx}
                        onClick={() => toggleWeekday(idx)}
                        className={`w-9 h-9 rounded-xl text-xs font-semibold transition-colors ${
                          f.weekdays.includes(idx)
                            ? 'bg-amber-500 text-gray-950'
                            : 'bg-gray-800 text-gray-400'
                        }`}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Start time */}
          <label className="block mb-5">
            <span className="text-xs font-semibold text-gray-400 tracking-wider uppercase">Start time</span>
            <input
              type="time"
              value={f.startTime}
              onChange={e => set('startTime', e.target.value)}
              className="mt-2 w-full bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors [color-scheme:dark]"
            />
          </label>

          {/* Reward goal */}
          <div className="mb-7 bg-gray-800/60 rounded-2xl p-4">
            <span className="text-xs font-semibold text-gray-400 tracking-wider uppercase">Reward goal</span>
            <div className="flex items-center gap-3 mt-3">
              <span className="text-gray-400 text-sm whitespace-nowrap">Streak target</span>
              <input
                type="number"
                min={1}
                max={365}
                value={f.rewardTarget}
                onChange={e => set('rewardTarget', parseInt(e.target.value, 10) || 7)}
                className="w-20 bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-white text-center focus:outline-none focus:border-amber-500 transition-colors"
              />
              <span className="text-gray-400 text-sm">days</span>
            </div>
            <input
              type="text"
              value={f.rewardText}
              onChange={e => set('rewardText', e.target.value)}
              placeholder="My reward… (e.g. Buy guitar pedal)"
              className="mt-3 w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2.5 text-white placeholder:text-gray-600 text-sm focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {initial && onDelete && (
              <button
                onClick={() => setConfirmDelete(true)}
                className="px-5 py-3.5 rounded-2xl bg-red-500/10 text-red-400 text-sm font-medium"
              >
                Delete
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={!valid}
              className="flex-1 py-3.5 rounded-2xl bg-amber-500 text-gray-950 font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              {initial ? 'Save changes' : 'Create activity'}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Delete confirmation */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            className="absolute inset-0 bg-black/70 flex items-center justify-center px-6 z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-gray-900 rounded-3xl p-6 w-full max-w-sm border border-gray-800"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <h3 className="font-bold text-lg mb-1">Delete this activity?</h3>
              <p className="text-gray-400 text-sm mb-5">All session history will be permanently deleted.</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDelete(false)} className="flex-1 py-3 bg-gray-800 rounded-2xl text-sm font-medium">
                  Cancel
                </button>
                <button
                  onClick={onDelete}
                  className="flex-1 py-3 bg-red-500/20 text-red-400 rounded-2xl text-sm font-medium"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
