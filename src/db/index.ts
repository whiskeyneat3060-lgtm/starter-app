import Dexie, { type Table } from 'dexie';
import { format, subDays } from 'date-fns';
import type { Activity, Session } from '../types';

class StreakDB extends Dexie {
  activities!: Table<Activity>;
  sessions!: Table<Session>;

  constructor() {
    super('StreakDB');
    this.version(1).stores({
      activities: '++id, createdAt',
      sessions: '++id, activityId, date, [activityId+date]',
    });
  }
}

export const db = new StreakDB();

export async function seedDatabase(): Promise<void> {
  const count = await db.activities.count();
  if (count > 0) return;

  const today = new Date();
  const createdAt = subDays(today, 9);

  const id = (await db.activities.add({
    name: 'Study Dutch',
    duration: 15,
    frequency: 'daily',
    weekdays: [],
    startTime: '08:30',
    rewardTarget: 14,
    rewardText: 'Buy guitar pedal',
    createdAt,
  })) as number;

  // Seed 7 consecutive completed days (days -8 through -2 from today) — streak = 7
  for (let i = 8; i >= 2; i--) {
    const d = subDays(today, i);
    await db.sessions.add({
      activityId: id,
      date: format(d, 'yyyy-MM-dd'),
      completed: true,
      partialMinutes: 15,
      startedAt: d,
      completedAt: d,
    });
  }
}
