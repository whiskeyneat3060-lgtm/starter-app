import { format, parseISO, subDays } from 'date-fns';
import type { Activity, Session } from '../types';
import { isScheduledDay } from './schedule';

function completedSet(sessions: Session[]): Set<string> {
  return new Set(sessions.filter(s => s.completed).map(s => s.date));
}

export function calculateCurrentStreak(activity: Activity, sessions: Session[]): number {
  const done = completedSet(sessions);
  const today = format(new Date(), 'yyyy-MM-dd');
  const created = format(activity.createdAt, 'yyyy-MM-dd');

  let streak = 0;
  let cursor = today;

  while (cursor >= created) {
    const date = parseISO(cursor);
    if (isScheduledDay(activity, date)) {
      if (done.has(cursor)) {
        streak++;
      } else if (cursor < today) {
        break; // missed a past scheduled day → chain broken
      }
      // cursor === today and not done → still pending, skip silently
    }
    cursor = format(subDays(date, 1), 'yyyy-MM-dd');
  }

  return streak;
}

export function calculateLongestStreak(activity: Activity, sessions: Session[]): number {
  const done = completedSet(sessions);
  const today = format(new Date(), 'yyyy-MM-dd');
  const created = format(activity.createdAt, 'yyyy-MM-dd');

  let longest = 0;
  let current = 0;
  let cursor = created;

  while (cursor <= today) {
    const date = parseISO(cursor);
    if (isScheduledDay(activity, date)) {
      if (done.has(cursor)) {
        current++;
        if (current > longest) longest = current;
      } else if (cursor < today) {
        current = 0;
      }
      // today pending: leave current untouched
    }
    const next = new Date(date.getTime() + 86_400_000);
    cursor = format(next, 'yyyy-MM-dd');
  }

  return longest;
}
