import { differenceInCalendarDays, getDay, startOfDay } from 'date-fns';
import type { Activity } from '../types';

export function isScheduledDay(activity: Activity, date: Date): boolean {
  const d = startOfDay(date);
  const created = startOfDay(activity.createdAt);

  if (d < created) return false;

  switch (activity.frequency) {
    case 'daily':
      return true;
    case 'alternate':
      return differenceInCalendarDays(d, created) % 2 === 0;
    case 'weekdays':
      return activity.weekdays.includes(getDay(d));
    default:
      return false;
  }
}

export const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
export const WEEKDAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function frequencyLabel(activity: Activity): string {
  switch (activity.frequency) {
    case 'daily':
      return 'Every day';
    case 'alternate':
      return 'Every other day';
    case 'weekdays': {
      if (activity.weekdays.length === 0) return 'No days set';
      return activity.weekdays.map(d => WEEKDAY_LABELS[d]).join(' · ');
    }
  }
}
