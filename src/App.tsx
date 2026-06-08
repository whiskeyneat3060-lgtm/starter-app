import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { seedDatabase } from './db';
import type { AppView } from './types';
import Home from './components/Home';
import ActivityDetail from './components/ActivityDetail';
import FocusTimer from './components/FocusTimer';

export default function App() {
  const [view, setView] = useState<AppView>({ screen: 'home' });

  useEffect(() => { seedDatabase(); }, []);

  return (
    <div className="max-w-lg mx-auto relative">
      <AnimatePresence mode="wait">
        {view.screen === 'home' && (
          <Home
            key="home"
            onSelectActivity={id => setView({ screen: 'detail', activityId: id })}
            onStartTimer={id => setView({ screen: 'timer', activityId: id, returnTo: 'home' })}
          />
        )}

        {view.screen === 'detail' && (
          <ActivityDetail
            key={`detail-${view.activityId}`}
            activityId={view.activityId}
            onBack={() => setView({ screen: 'home' })}
            onStartTimer={() =>
              setView({ screen: 'timer', activityId: view.activityId, returnTo: 'detail' })
            }
          />
        )}

        {view.screen === 'timer' && (
          <FocusTimer
            key={`timer-${view.activityId}`}
            activityId={view.activityId}
            onClose={() =>
              view.returnTo === 'detail'
                ? setView({ screen: 'detail', activityId: view.activityId })
                : setView({ screen: 'home' })
            }
            onComplete={() => setView({ screen: 'home' })}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
