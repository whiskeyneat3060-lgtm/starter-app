import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { format } from 'date-fns';
import { db } from '../db';
import { useActivitySessions } from '../hooks/useSessions';
import { calculateCurrentStreak, calculateLongestStreak } from '../utils/streak';
import { isScheduledDay, frequencyLabel } from '../utils/schedule';
import Calendar from './Calendar';
import ActivityForm from './ActivityForm';
import type { Activity } from '../types';

interface Props {
  activityId: number;
  onBack: () => void;
  onStartTimer: () => void;
}

export default function ActivityDetail({ activityId, onBack, onStartTimer }: Props) {
  const activity = useLiveQuery(() => db.activities.get(activityId), [activityId]);
  const sessions = useActivitySessions(activityId);
  const [showEdit, setShowEdit] = useState(false);

  if (!activity) return null;

  const streak = calculateCurrentStreak(activity, sessions);
  const longest = calculateLongestStreak(activity, sessions);
  const progress = Math.min(1, streak / activity.rewardTarget);
  const rewardEarned = streak >= activity.rewardTarget;

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayDone = sessions.some(s => s.date === todayStr && s.completed);
  const todaySched = isScheduledDay(activity, new Date());

  async function handleSave(data: Omit<Activity, 'id' | 'createdAt'>) {
    await db.activities.update(activityId, data);
    setShowEdit(false);
  }

  async function handleDelete() {
    await db.activities.delete(activityId);
    await db.sessions.where('activityId').equals(activityId).delete();
    onBack();
  }

  return (
    <div className="min-h-screen bg-gray-950 pb-12">
      {/* Header */}
      <div className="sticky top-0 bg-gray-950/90 backdrop-blur-md z-10 px-4 pt-12 pb-4 border-b border-gray-900">
        <div className="flex items-center justify-between">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <span className="text-xl">←</span>
            <span className="text-sm">Home</span>
          </motion.button>
          <button
            onClick={() => setShowEdit(true)}
            className="text-gray-400 hover:text-white transition-colors text-sm px-3 py-1.5 bg-gray-800 rounded-xl"
          >
            Edit
          </button>
        </div>
        <h1 className="text-2xl font-bold mt-3">{activity.name}</h1>
        <p className="text-gray-500 text-sm mt-0.5">{frequencyLabel(activity)} · {activity.startTime}</p>
      </div>

      <div className="px-4 mt-6 space-y-4">
        {/* Streak stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-900 border border-gray-800/60 rounded-3xl p-5 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <span className="text-2xl">🔥</span>
              <span className="text-3xl font-bold text-amber-400 tabular-nums">{streak}</span>
            </div>
            <p className="text-gray-500 text-xs">Current streak</p>
          </div>
          <div className="bg-gray-900 border border-gray-800/60 rounded-3xl p-5 text-center">
            <div className="text-3xl font-bold text-amber-400 tabular-nums mb-1">{longest}</div>
            <p className="text-gray-500 text-xs">Longest streak</p>
          </div>
        </div>

        {/* Reward card */}
        <div className={`rounded-3xl p-5 border ${rewardEarned ? 'bg-amber-500/10 border-amber-500/30' : 'bg-gray-900 border-gray-800/60'}`}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs font-semibold text-gray-400 tracking-wider uppercase mb-1">Reward goal</p>
              <p className="text-white font-medium">{activity.rewardText}</p>
            </div>
            {rewardEarned && <span className="text-3xl">🏆</span>}
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${rewardEarned ? 'bg-amber-400' : 'bg-amber-500'}`}
              initial={{ width: 0 }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs">
            <span className="text-gray-500">{streak} days completed</span>
            <span className={rewardEarned ? 'text-amber-400 font-semibold' : 'text-gray-500'}>
              {rewardEarned ? 'Earned!' : `Goal: ${activity.rewardTarget} days`}
            </span>
          </div>
        </div>

        {/* Start button */}
        {!todayDone && todaySched && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onStartTimer}
            className="w-full py-4 bg-amber-500 text-gray-950 font-bold rounded-3xl text-base"
          >
            Start {activity.duration} min session
          </motion.button>
        )}
        {todayDone && (
          <div className="w-full py-4 bg-emerald-500/10 text-emerald-400 font-medium rounded-3xl text-base text-center">
            ✓ Session complete for today
          </div>
        )}
        {!todaySched && !todayDone && (
          <div className="w-full py-4 bg-gray-800/40 text-gray-600 font-medium rounded-3xl text-base text-center">
            Rest day — no session scheduled
          </div>
        )}

        {/* Calendar */}
        <div className="bg-gray-900 border border-gray-800/60 rounded-3xl p-5">
          <h2 className="text-sm font-semibold text-gray-400 tracking-wider uppercase mb-5">History</h2>
          <Calendar activity={activity} sessions={sessions} />
        </div>

        {/* Session count */}
        <div className="bg-gray-900 border border-gray-800/60 rounded-3xl p-5">
          <p className="text-xs text-gray-500 tracking-wider uppercase font-semibold mb-3">All time</p>
          <div className="flex gap-6">
            <div>
              <p className="text-2xl font-bold text-white tabular-nums">
                {sessions.filter(s => s.completed).length}
              </p>
              <p className="text-gray-500 text-xs">Sessions completed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white tabular-nums">
                {sessions.reduce((sum, s) => sum + (s.completed ? s.partialMinutes : 0), 0)}
              </p>
              <p className="text-gray-500 text-xs">Minutes logged</p>
            </div>
          </div>
        </div>
      </div>

      {/* Edit form */}
      <AnimatePresence>
        {showEdit && (
          <ActivityForm
            initial={activity}
            onSave={handleSave}
            onDelete={handleDelete}
            onClose={() => setShowEdit(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
