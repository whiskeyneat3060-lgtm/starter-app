import { NavLink } from 'react-router-dom';
import { Home, BarChart2, Target, BookOpen } from 'lucide-react';

const tabs = [
  { to: '/',       icon: Home,      label: 'Home' },
  { to: '/trends', icon: BarChart2, label: 'Trends' },
  { to: '/goals',  icon: Target,    label: 'Goals' },
  { to: '/log',    icon: BookOpen,  label: 'Log' },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur border-t border-border safe-area-pb">
      <div className="flex">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-1 py-3 text-[10px] uppercase tracking-wider font-medium transition-colors ${
                isActive ? 'text-energy' : 'text-muted'
              }`
            }
          >
            <Icon size={20} strokeWidth={1.8} />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
