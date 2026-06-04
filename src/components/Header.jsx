import { useState, useEffect } from 'react';
import {
  isNasdaqOpen, isEuronextOpen,
  nasdaqCountdown, euronextCountdown,
  formatCountdown,
} from '../utils/formatters.js';

const MARKETS = [
  { id: 'NASDAQ',   label: 'NASDAQ', flag: '🇺🇸' },
  { id: 'EURONEXT', label: 'Euronext', flag: '🇪🇺' },
];

const CONF_FILTERS = [
  { value: 95, label: '🔥 ≥95%', cls: 'elite' },
  { value: 90, label: '⚡ ≥90%', cls: 'high'  },
  { value: 80, label: '✓ ≥80%',  cls: 'strong'},
];

function MarketPill({ market, active, onToggle }) {
  const [open, setOpen] = useState(false);
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    const update = () => {
      const isOpen = market.id === 'NASDAQ' ? isNasdaqOpen() : isEuronextOpen();
      const cd     = market.id === 'NASDAQ' ? nasdaqCountdown() : euronextCountdown();
      setOpen(isOpen);
      setCountdown(cd);
    };
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, [market.id]);

  return (
    <button
      className={`market-pill ${active ? 'active' : ''} ${open ? 'mkt-open' : 'mkt-closed'}`}
      onClick={() => onToggle(market.id)}
      title={countdown ? `${countdown.label} ${formatCountdown(countdown.mins)}` : ''}
    >
      <span className={`mkt-dot ${open ? 'pulsing' : ''}`} />
      <span className="mkt-flag">{market.flag}</span>
      <span className="mkt-name">{market.label}</span>
      <span className={`mkt-status-text ${open ? 'open' : ''}`}>
        {open ? 'Open' : (countdown ? formatCountdown(countdown.mins) : 'Closed')}
      </span>
    </button>
  );
}

export function Header({
  activeMarkets, onMarketsChange,
  confidenceMin, onConfidenceChange,
  scanning, lastScan, signalCount, stocksScanned,
  onMenuToggle,
}) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const toggleMarket = (id) => {
    onMarketsChange(prev =>
      prev.includes(id)
        ? prev.length > 1 ? prev.filter(m => m !== id) : prev
        : [...prev, id]
    );
  };

  const hh = time.getHours().toString().padStart(2,'0');
  const mm = time.getMinutes().toString().padStart(2,'0');
  const ss = time.getSeconds().toString().padStart(2,'0');

  return (
    <header className="app-header">
      <div className="header-row1">
        <button className="menu-toggle-btn" onClick={onMenuToggle}>☰</button>

        <div className="market-pills">
          {MARKETS.map(m => (
            <MarketPill
              key={m.id}
              market={m}
              active={activeMarkets.includes(m.id)}
              onToggle={toggleMarket}
            />
          ))}
        </div>

        <div className="header-spacer" />

        <div className="header-stats">
          {stocksScanned > 0 && (
            <span className="stat-chip">
              <span className="stat-val">{stocksScanned}</span> scanned
            </span>
          )}
          {signalCount > 0 && (
            <span className="stat-chip signals">
              <span className="stat-val">{signalCount}</span> signal{signalCount !== 1 ? 's' : ''}
            </span>
          )}
          {lastScan && (
            <span className="stat-chip muted">
              {lastScan.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'})}
            </span>
          )}
        </div>

        <div className="header-clock">
          <span className="clock-time">{hh}:{mm}:{ss}</span>
          <span className="clock-tz">ET</span>
        </div>
      </div>

      <div className="header-row2">
        <span className="conf-label">Confidence Filter</span>
        <div className="conf-filters">
          {CONF_FILTERS.map(f => (
            <button
              key={f.value}
              className={`conf-btn conf-${f.cls} ${confidenceMin === f.value ? 'active' : ''}`}
              onClick={() => onConfidenceChange(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="conf-hint">
          {confidenceMin === 95 ? 'Only the absolute best setups' :
           confidenceMin === 90 ? 'High-conviction setups only' :
           'Broad scan — more signals, lower certainty'}
        </span>
      </div>
    </header>
  );
}
