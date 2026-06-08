import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useActivitySessions } from '../hooks/useSessions';
import ActivityCard from './ActivityCard';
import ActivityForm from './ActivityForm';
import type { Activity } from '../types';

interface Props {
  onSelectActivity: (id: number) => void;
  onStartTimer: (id: number) => void;
}

function ActivityRow({
  activity,
  onSelect,
  onStart,
}: {
  activity: Activity;
  onSelect: () => void;
  onStart: () => void;
}) {
  const sessions = useActivitySessions(activity.id);
  return (
    <ActivityCard
      activity={activity}
      sessions={sessions}
      onViewDetail={onSelect}
      onStart={onStart}
    />
  );
}

export default function Home({ onSelectActivity, onStartTimer }: Props) {
  const activities = useLiveQuery(() => db.activities.orderBy('createdAt').toArray(), []) ?? [];
  const [showForm, setShowForm] = useState(false);

  async function handleCreate(data: Omit<Activity, 'id' | 'createdAt'>) {
    await db.activities.add({ ...data, createdAt: new Date() });
    setShowForm(false);
  }

  const today = new Date();
  const hour = today.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="px-5 pt-14 pb-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-gray-500 text-sm">{greeting}</p>
            <h1 className="text-3xl font-bold tracking-tight mt-0.5">
              Streak<span className="text-amber-500">.</span>
            </h1>
          </div>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setShowForm(true)}
            className="w-10 h-10 bg-amber-500 rounded-2xl flex items-center justify-center text-gray-950 font-bold text-xl shadow-lg shadow-amber-500/20"
          >
            +
          </motion.button>
        </div>
      </div>

      {/* Activity list */}
      <div className="px-4 space-y-3 pb-24">
        <AnimatePresence>
          {activities.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20"
            >
              <div className="text-5xl mb-4">🔥</div>
              <h2 className="text-xl font-semibold text-white mb-2">No habits yet</h2>
              <p className="text-gray-500 text-sm">Tap + to create your first activity</p>
            </motion.div>
          ) : (
            activities.map(a => (
              <ActivityRow
                key={a.id}
                activity={a}
                onSelect={() => onSelectActivity(a.id!)}
                onStart={() => onStartTimer(a.id!)}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Footer label */}
      {activities.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 flex justify-center pb-6 pointer-events-none">
          <span className="text-gray-700 text-xs">{activities.length} habit{activities.length !== 1 ? 's' : ''} tracked</span>
        </div>
      )}

      {/* Create form */}
      <AnimatePresence>
        {showForm && (
          <ActivityForm
            onSave={handleCreate}
            onClose={() => setShowForm(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
