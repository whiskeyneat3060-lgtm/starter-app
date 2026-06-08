import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { getOrCreateTodaySession, completeSession, savePartialSession } from '../hooks/useSessions';
import { calculateCurrentStreak } from '../utils/streak';
import ConfettiEffect from './ConfettiEffect';

const R = 108;
const CIRC = 2 * Math.PI * R;

interface Props {
  activityId: number;
  onClose: () => void;
  onComplete: () => void;
}

export default function FocusTimer({ activityId, onClose, onComplete }: Props) {
  const activity = useLiveQuery(() => db.activities.get(activityId), [activityId]);
  const sessions = useLiveQuery(
    () => db.sessions.where('activityId').equals(activityId).toArray(),
    [activityId]
  );

  const [sessionId, setSessionId] = useState<number | null>(null);
  const [totalSecs, setTotalSecs] = useState(0);
  const [secsLeft, setSecsLeft] = useState(0);
  const [paused, setPaused] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [rewardEarned, setRewardEarned] = useState(false);
  const [showCancel, setShowCancel] = useState(false);

  const completedRef = useRef(false);
  const sessionIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Init timer when activity loads
  useEffect(() => {
    if (!activity) return;
    const secs = activity.duration * 60;
    setTotalSecs(secs);
    setSecsLeft(secs);
    getOrCreateTodaySession(activityId).then(id => {
      setSessionId(id);
      sessionIdRef.current = id;
    });
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity?.id]);

  // Countdown tick
  useEffect(() => {
    if (paused || completed || totalSecs === 0) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      return;
    }
    intervalRef.current = setInterval(() => setSecsLeft(s => Math.max(0, s - 1)), 1000);
    return () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } };
  }, [paused, completed, totalSecs]);

  const handleComplete = useCallback(async () => {
    const sid = sessionIdRef.current;
    if (!sid || !activity) return;
    await completeSession(sid, activity.duration);

    const all = await db.sessions.where('activityId').equals(activityId).toArray();
    const streak = calculateCurrentStreak(activity, all);
    if (streak >= activity.rewardTarget) setRewardEarned(true);

    setCompleted(true);
  }, [activity, activityId]);

  // Watch for zero
  useEffect(() => {
    if (secsLeft === 0 && totalSecs > 0 && !completedRef.current) {
      completedRef.current = true;
      handleComplete();
    }
  }, [secsLeft, totalSecs, handleComplete]);

  async function handleCancel() {
    const sid = sessionIdRef.current;
    if (sid && activity) {
      const elapsed = Math.floor((totalSecs - secsLeft) / 60);
      if (elapsed > 0) await savePartialSession(sid, elapsed);
    }
    onClose();
  }

  const progress = totalSecs > 0 ? 1 - secsLeft / totalSecs : 0;
  const dashOffset = CIRC * (1 - progress);
  const mins = Math.floor(secsLeft / 60);
  const secs = secsLeft % 60;
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const currentStreak = activity && sessions ? calculateCurrentStreak(activity, sessions) : 0;

  if (!activity) return null;

  return (
    <motion.div
      className="fixed inset-0 bg-gray-950 flex flex-col items-center justify-center z-40 px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {completed && <ConfettiEffect />}

      <AnimatePresence mode="wait">
        {completed ? (
          <motion.div
            key="done"
            className="flex flex-col items-center gap-6 text-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 18 }}
          >
            <motion.div
              animate={{ scale: [1, 1.15, 1, 1.1, 1] }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-8xl"
            >
              {rewardEarned ? '🏆' : '🔥'}
            </motion.div>

            <div>
              <h2 className="text-3xl font-bold text-white mb-1">
                {rewardEarned ? 'Reward earned!' : 'Session complete!'}
              </h2>
              {rewardEarned ? (
                <p className="text-amber-400 font-medium">{activity.rewardText}</p>
              ) : (
                <p className="text-gray-400">
                  {currentStreak} day streak · Keep going!
                </p>
              )}
            </div>

            {/* Filled circle visual */}
            <svg width="220" height="220" className="-rotate-90">
              <circle cx="110" cy="110" r={R} fill="none" stroke="#1f2937" strokeWidth="10" />
              <motion.circle
                cx="110" cy="110" r={R}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                initial={{ strokeDashoffset: CIRC * 0.3 }}
                animate={{ strokeDashoffset: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </svg>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onComplete}
              className="px-10 py-4 bg-amber-500 text-gray-950 font-bold rounded-2xl text-base"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              Back to home
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            key="running"
            className="flex flex-col items-center gap-8 w-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="text-center">
              <p className="text-gray-500 text-xs font-semibold tracking-widest uppercase mb-1">
                {activity.name}
              </p>
              <p className="text-gray-600 text-xs">
                {paused ? 'Paused' : 'Focus session'}
              </p>
            </div>

            {/* Timer circle */}
            <div className="relative flex items-center justify-center">
              <svg width="260" height="260" className="-rotate-90">
                <circle cx="130" cy="130" r={R} fill="none" stroke="#1a1a2e" strokeWidth="10" />
                <circle
                  cx="130" cy="130" r={R}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={CIRC}
                  strokeDashoffset={dashOffset}
                  style={{ transition: paused ? 'none' : 'stroke-dashoffset 1s linear' }}
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-6xl font-bold tabular-nums tracking-tight text-white">{timeStr}</span>
                <span className="text-gray-500 text-sm mt-1">remaining</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex gap-3 w-full max-w-xs">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setPaused(p => !p)}
                className="flex-1 py-3.5 bg-gray-800 text-white font-semibold rounded-2xl"
              >
                {paused ? 'Resume' : 'Pause'}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowCancel(true)}
                className="px-5 py-3.5 bg-gray-800/50 text-gray-500 font-medium rounded-2xl"
              >
                Cancel
              </motion.button>
            </div>

            <p className="text-gray-700 text-xs text-center max-w-[200px]">
              Complete the full session to count toward your streak
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cancel confirmation sheet */}
      <AnimatePresence>
        {showCancel && (
          <motion.div
            className="fixed inset-0 bg-black/70 flex items-end p-4 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full bg-gray-900 rounded-3xl p-6 border border-gray-800"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 280 }}
            >
              <h3 className="font-bold text-lg mb-1">End session early?</h3>
              <p className="text-gray-400 text-sm mb-6">
                Your partial progress will be logged, but today won't count toward your streak.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancel(false)}
                  className="flex-1 py-3.5 bg-gray-800 rounded-2xl text-sm font-semibold"
                >
                  Keep going
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 py-3.5 bg-red-500/15 text-red-400 rounded-2xl text-sm font-semibold"
                >
                  End session
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
