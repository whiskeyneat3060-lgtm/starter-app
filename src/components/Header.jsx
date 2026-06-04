import { useState, useEffect } from 'react';
import { isMarketOpen } from '../utils/formatters.js';

export function Header({ signalCount, lastScan, scanning, onScan }) {
  const [time, setTime] = useState(new Date());
  const [open, setOpen] = useState(isMarketOpen());

  useEffect(() => {
    const id = setInterval(() => {
      setTime(new Date());
      setOpen(isMarketOpen());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const hh = time.getHours().toString().padStart(2, '0');
  const mm = time.getMinutes().toString().padStart(2, '0');
  const ss = time.getSeconds().toString().padStart(2, '0');

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="logo">
          <span className="logo-icon">◈</span>
          <span className="logo-text">AI Auto Trading</span>
        </div>
        <div className="header-meta">
          <span className="exchange-badge">NASDAQ</span>
          <span className={`market-status ${open ? 'open' : 'closed'}`}>
            <span className="status-dot" />
            {open ? 'Market Open' : 'Market Closed'}
          </span>
        </div>
      </div>

      <div className="header-center">
        <span className="clock">{hh}:{mm}:{ss}</span>
        <span className="clock-tz">ET</span>
      </div>

      <div className="header-right">
        {lastScan && (
          <span className="last-scan">
            Last scan: {lastScan.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        )}
        {signalCount > 0 && (
          <span className="signal-count-badge">{signalCount} signal{signalCount !== 1 ? 's' : ''}</span>
        )}
        <button
          className={`scan-btn ${scanning ? 'scanning' : ''}`}
          onClick={onScan}
          disabled={scanning}
        >
          {scanning ? (
            <><span className="spin-icon">↻</span> Scanning…</>
          ) : (
            <><span>⟳</span> Scan Now</>
          )}
        </button>
      </div>
    </header>
  );
}
