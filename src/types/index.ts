export type Frequency = 'daily' | 'alternate' | 'weekdays';

export interface Activity {
  id?: number;
  name: string;
  duration: number;       // minutes
  frequency: Frequency;
  weekdays: number[];     // 0=Sun … 6=Sat (used when frequency='weekdays')
  startTime: string;      // HH:MM
  rewardTarget: number;   // streak goal
  rewardText: string;
  createdAt: Date;
}

export interface Session {
  id?: number;
  activityId: number;
  date: string;           // YYYY-MM-DD
  completed: boolean;
  partialMinutes: number;
  startedAt: Date;
  completedAt?: Date;
}

export type AppView =
  | { screen: 'home' }
  | { screen: 'detail'; activityId: number }
  | { screen: 'timer'; activityId: number; returnTo: 'home' | 'detail' };
