import { useState } from 'react';

const NAV = [
  { id: 'scanner',   icon: '📡', label: 'Signal Scanner' },
  { id: 'favorites', icon: '⭐', label: 'Favourites' },
  { id: 'history',   icon: '🕐', label: 'Signal History' },
];

export function Sidebar({ view, onViewChange, favorites, signalHistory, onFavoriteOpen, isOpen, onToggle }) {
  const [histOpen, setHistOpen] = useState(false);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && <div className="sidebar-overlay" onClick={onToggle} />}

      <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-logo">
          <div className="logo-mark">
            <svg viewBox="0 0 24 24" fill="none" className="logo-icon-svg">
              <rect width="24" height="24" rx="5" fill="#4f46e5"/>
              <polyline points="3,18 7,12 11,15 17,8 21,11" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="logo-text-block">
            <span className="logo-name">AI Trading</span>
            <span className="logo-sub">Signals</span>
          </div>
          <button className="sidebar-close-btn" onClick={onToggle}>✕</button>
        </div>

        <nav className="sidebar-nav">
          {NAV.map(item => (
            <button
              key={item.id}
              className={`nav-item ${view === item.id ? 'active' : ''}`}
              onClick={() => { onViewChange(item.id); if (window.innerWidth < 768) onToggle(); }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
              {item.id === 'favorites' && favorites.length > 0 && (
                <span className="nav-badge">{favorites.length}</span>
              )}
              {item.id === 'history' && signalHistory.length > 0 && (
                <span className="nav-badge">{signalHistory.length}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Favourites list */}
        {view === 'favorites' && favorites.length > 0 && (
          <div className="sidebar-section">
            <div className="section-header">Saved Stocks</div>
            {favorites.map(sym => (
              <button key={sym} className="fav-item" onClick={() => onFavoriteOpen(sym)}>
                <span className="fav-symbol">{sym}</span>
                <span className="fav-arrow">→</span>
              </button>
            ))}
          </div>
        )}

        {/* Signal history list */}
        {view === 'history' && signalHistory.length > 0 && (
          <div className="sidebar-section">
            <div className="section-header">Today's Signals</div>
            {signalHistory.slice().reverse().map((s, i) => (
              <button key={i} className="fav-item" onClick={() => onFavoriteOpen(s.symbol, s)}>
                <div>
                  <span className="fav-symbol">{s.symbol}</span>
                  <span style={{ fontSize: 10, color: 'var(--sidebar-text)', opacity: 0.6, marginLeft: 6 }}>
                    {s.confidence}%
                  </span>
                </div>
                <span className="fav-arrow">→</span>
              </button>
            ))}
          </div>
        )}

        <div className="sidebar-footer">
          <div className="footer-line">v1.0 · For reference only</div>
          <div className="footer-line" style={{ color: 'rgba(203,213,225,0.4)', fontSize: 10 }}>Not financial advice</div>
        </div>
      </aside>
    </>
  );
}
