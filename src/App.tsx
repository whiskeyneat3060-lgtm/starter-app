import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getMe } from './lib/api';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Trends from './pages/Trends';
import Goals from './pages/Goals';
import Log from './pages/Log';
import Settings from './pages/Settings';
import { BottomNav } from './components/layout/BottomNav';
import { FAB } from './components/layout/FAB';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: me, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-energy border-t-transparent animate-spin" />
      </div>
    );
  }

  // In dev/seed mode, skip auth
  if (!me && import.meta.env.PROD) return <Navigate to="/login" replace />;

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <AuthGuard>
              <div className="min-h-screen bg-base pb-20">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/trends" element={<Trends />} />
                  <Route path="/goals" element={<Goals />} />
                  <Route path="/log" element={<Log />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
                <FAB />
                <BottomNav />
              </div>
            </AuthGuard>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
