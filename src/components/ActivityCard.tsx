import { format } from 'date-fns';
import { motion } from 'framer-motion';
import type { Activity, Session } from '../types';
import { calculateCurrentStreak } from '../utils/streak';
import { isScheduledDay, frequencyLabel } from '../utils/schedule';

interface Props {
  activity: Activity;
  sessions: Session[];
  onStart: () => void;
  onViewDetail: () => void;
}

export default function ActivityCard({ activity, sessions, onStart, onViewDetail }: Props) {
  const streak = calculateCurrentStreak(activity, sessions);
  const progress = Math.min(1, streak / activity.rewardTarget);
  const rewardEarned = streak >= activity.rewardTarget;

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayDone = sessions.some(s => s.date === todayStr && s.completed);
  const todaySched = isScheduledDay(activity, new Date());

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      onClick={onViewDetail}
      className="bg-gray-900 border border-gray-800/60 rounded-3xl p-5 cursor-pointer active:scale-[0.98] transition-transform"
    >
      {/* Header row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 pr-3">
          <h3 className="font-semibold text-white text-[17px] leading-tight truncate">{activity.name}</h3>
          <p className="text-gray-500 text-xs mt-0.5">
            {frequencyLabel(activity)} · {activity.startTime}
          </p>
        </div>
        <div className="flex items-center gap-1 bg-gray-800 rounded-2xl px-3 py-1.5 flex-shrink-0">
          <span className="text-[18px] leading-none">🔥</span>
          <span className="text-amber-400 font-bold text-lg leading-none tabular-nums">{streak}</span>
        </div>
      </div>

      {/* Reward bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-gray-500 truncate max-w-[70%]">{activity.rewardText}</span>
          <span className={rewardEarned ? 'text-emerald-400 font-medium' : 'text-gray-500'}>
            {rewardEarned ? '🏆 Earned!' : `${streak} / ${activity.rewardTarget}`}
          </span>
        </div>
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${rewardEarned ? 'bg-emerald-400' : 'bg-amber-500'}`}
            initial={{ width: 0 }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }}
          />
        </div>
      </div>

      {/* Action button */}
      {todayDone ? (
        <div className="w-full py-3 rounded-2xl bg-emerald-500/10 text-emerald-400 text-sm font-medium text-center">
          ✓ Done for today
        </div>
      ) : todaySched ? (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={e => { e.stopPropagation(); onStart(); }}
          className="w-full py-3 rounded-2xl bg-amber-500 text-gray-950 text-sm font-bold"
        >
          Start {activity.duration} min session
        </motion.button>
      ) : (
        <div className="w-full py-3 rounded-2xl bg-gray-800/40 text-gray-600 text-sm font-medium text-center">
          Rest day
        </div>
      )}
    </motion.div>
  );
}
