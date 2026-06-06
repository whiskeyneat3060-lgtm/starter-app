import { useState, useEffect } from 'react';
import { isNasdaqOpen, isEuronextOpen } from '../utils/formatters.js';

export function Header({ scanning, lastScan, signalCount, stocksScanned, onMenuToggle, onSearchOpen }) {
  const [time, setTime] = useState(new Date());
  const [mktOpen, setMktOpen] = useState(false);

  useEffect(() => {
    const tick = () => {
      setTime(new Date());
      setMktOpen(isNasdaqOpen() || isEuronextOpen());
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const hh = time.getHours().toString().padStart(2, '0');
  const mm = time.getMinutes().toString().padStart(2, '0');
  const ss = time.getSeconds().toString().padStart(2, '0');

  return (
    <header className="app-header">
      <button className="menu-toggle-btn" onClick={onMenuToggle} aria-label="Menu">
        <svg width="18" height="14" viewBox="0 0 18 14" fill="currentColor">
          <rect y="0"  width="18" height="2" rx="1"/>
          <rect y="6"  width="18" height="2" rx="1"/>
          <rect y="12" width="18" height="2" rx="1"/>
        </svg>
      </button>

      <div className="header-brand">
        <svg width="26" height="26" viewBox="0 0 24 24" className="brand-logo-svg">
          <rect width="24" height="24" rx="5" fill="#4f46e5"/>
          <polyline points="3,17 7,11 11,14 17,7 21,10" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="21" cy="10" r="1.5" fill="#fbbf24"/>
        </svg>
        <span className="brand-name">AI Trading</span>
        <span className="brand-sub">Signals</span>
      </div>

      <div className="header-mid">
        {scanning ? (
          <span className="hdr-status scanning">
            <span className="hdr-spin">⟳</span>
            <span className="hdr-status-txt">Scanning…</span>
          </span>
        ) : signalCount > 0 ? (
          <span className="hdr-status has-signals">
            <span className="hdr-dot active" />
            <span className="hdr-status-txt">{signalCount} signal{signalCount !== 1 ? 's' : ''}</span>
          </span>
        ) : (
          <span className={`hdr-status ${mktOpen ? 'mkt-live' : 'mkt-closed'}`}>
            <span className={`hdr-dot ${mktOpen ? 'live' : ''}`} />
            <span className="hdr-status-txt">{mktOpen ? 'Market Open' : 'Market Closed'}</span>
          </span>
        )}
      </div>

      <div className="header-right">
        <div className="header-clock">
          <span className="clock-time">{hh}:{mm}<span className="clock-sec">:{ss}</span></span>
        </div>
        <button className="hdr-search-btn" onClick={onSearchOpen} aria-label="Search stocks">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M14 14l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </header>
  );
}
