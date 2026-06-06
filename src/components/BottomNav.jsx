const TABS = [
  { id: 'scanner',   icon: '📡', label: 'Signals'  },
  { id: 'search',    icon: '🔍', label: 'Search'   },
  { id: 'favorites', icon: '⭐', label: 'Saved'    },
  { id: 'history',   icon: '🕐', label: 'History'  },
];

export function BottomNav({ view, onChange, favCount, histCount }) {
  return (
    <nav className="bottom-nav">
      {TABS.map(t => (
        <button
          key={t.id}
          className={`bn-tab ${view === t.id ? 'active' : ''}`}
          onClick={() => onChange(t.id)}
        >
          <span className="bn-icon">{t.icon}</span>
          <span className="bn-label">{t.label}</span>
          {t.id === 'favorites' && favCount > 0  && <span className="bn-badge">{favCount}</span>}
          {t.id === 'history'   && histCount > 0 && <span className="bn-badge">{histCount}</span>}
        </button>
      ))}
    </nav>
  );
}
