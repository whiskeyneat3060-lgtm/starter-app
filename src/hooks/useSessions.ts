import { useLiveQuery } from 'dexie-react-hooks';
import { format } from 'date-fns';
import { db } from '../db';
import type { Session } from '../types';

export function useActivitySessions(activityId: number | undefined): Session[] {
  return useLiveQuery(
    () =>
      activityId !== undefined
        ? db.sessions.where('activityId').equals(activityId).toArray()
        : Promise.resolve([]),
    [activityId]
  ) ?? [];
}

export async function getOrCreateTodaySession(activityId: number): Promise<number> {
  const today = format(new Date(), 'yyyy-MM-dd');
  const existing = await db.sessions
    .where('[activityId+date]')
    .equals([activityId, today])
    .first();

  if (existing?.id !== undefined) return existing.id;

  return (await db.sessions.add({
    activityId,
    date: today,
    completed: false,
    partialMinutes: 0,
    startedAt: new Date(),
  })) as number;
}

export async function completeSession(sessionId: number, minutes: number): Promise<void> {
  await db.sessions.update(sessionId, {
    completed: true,
    partialMinutes: minutes,
    completedAt: new Date(),
  });
}

export async function savePartialSession(sessionId: number, minutes: number): Promise<void> {
  await db.sessions.update(sessionId, { partialMinutes: minutes });
}
