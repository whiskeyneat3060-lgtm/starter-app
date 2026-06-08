import { useState } from 'react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, addMonths, subMonths, parseISO,
} from 'date-fns';
import { motion } from 'framer-motion';
import type { Activity, Session } from '../types';
import { isScheduledDay } from '../utils/schedule';

const DAY_HDRS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

type DayStatus = 'completed' | 'missed' | 'pending' | 'future-sched' | 'neutral' | 'outside';

interface CalendarProps {
  activity: Activity;
  sessions: Session[];
}

export default function Calendar({ activity, sessions }: CalendarProps) {
  const [viewDate, setViewDate] = useState(new Date());

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const calDays = eachDayOfInterval({
    start: startOfWeek(monthStart),
    end: endOfWeek(monthEnd),
  });

  const done = new Set(sessions.filter(s => s.completed).map(s => s.date));
  const today = format(new Date(), 'yyyy-MM-dd');

  function status(day: Date): DayStatus {
    if (!isSameMonth(day, viewDate)) return 'outside';
    const str = format(day, 'yyyy-MM-dd');
    const sched = isScheduledDay(activity, day);

    if (done.has(str)) return 'completed';
    if (!sched) return 'neutral';
    if (str < today) return 'missed';
    if (str === today) return 'pending';
    return 'future-sched';
  }

  const canGoNext = addMonths(viewDate, 1) <= addMonths(new Date(), 0)
    ? true
    : false;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => setViewDate(d => subMonths(d, 1))}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors text-lg"
        >
          ‹
        </button>
        <span className="font-semibold text-white">{format(viewDate, 'MMMM yyyy')}</span>
        <button
          onClick={() => setViewDate(d => addMonths(d, 1))}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors text-lg"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 mb-2">
        {DAY_HDRS.map(h => (
          <div key={h} className="text-center text-xs font-medium text-gray-600 py-1">{h}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {calDays.map(day => {
          const s = status(day);
          const str = format(day, 'yyyy-MM-dd');
          const isToday = str === today;

          const base = 'aspect-square flex items-center justify-center text-sm rounded-xl relative select-none';
          const styles: Record<DayStatus, string> = {
            outside: 'opacity-0 pointer-events-none',
            completed: 'bg-amber-500 text-gray-950 font-bold',
            missed: 'bg-red-950/60 text-red-400',
            pending: 'text-white',
            'future-sched': 'text-gray-500',
            neutral: 'text-gray-700',
          };

          return (
            <motion.div
              key={str}
              className={`${base} ${styles[s]} ${isToday ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-gray-900' : ''}`}
              initial={s === 'completed' ? { scale: 0.6 } : false}
              animate={s === 'completed' ? { scale: 1 } : {}}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              {format(day, 'd')}
              {s === 'missed' && (
                <span className="absolute bottom-0.5 right-0.5 text-[9px] leading-none">✕</span>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="flex gap-4 mt-5 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-amber-500 inline-block" /> Done
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-red-950/60 inline-block" /> Missed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border border-amber-400 inline-block" /> Today
        </span>
      </div>
    </div>
  );
}
