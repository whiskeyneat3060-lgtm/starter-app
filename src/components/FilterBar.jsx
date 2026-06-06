import { useState } from 'react';
import { isNasdaqOpen, isEuronextOpen, nasdaqCountdown, euronextCountdown, formatCountdown } from '../utils/formatters.js';

function InfoTip({ text }) {
  const [show, setShow] = useState(false);
  return (
    <span className="infotip-wrap"
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}
      onClick={e => { e.stopPropagation(); setShow(p => !p); }}>
      <span className="infotip-icon">ⓘ</span>
      {show && <div className="infotip-bubble">{text}</div>}
    </span>
  );
}

function FilterGroup({ label, tip, children }) {
  return (
    <div className="filter-group">
      <div className="filter-group-label">
        {label}
        <InfoTip text={tip} />
      </div>
      <div className="filter-chips">{children}</div>
    </div>
  );
}

const MARKETS = [
  { id: 'NASDAQ',   flag: '🇺🇸', label: 'NASDAQ',  isOpen: isNasdaqOpen,   cd: nasdaqCountdown },
  { id: 'EURONEXT', flag: '🇪🇺', label: 'Euronext', isOpen: isEuronextOpen, cd: euronextCountdown },
];

const TIMEFRAMES = [
  { id: 'intraday', icon: '⚡', label: 'Intraday', sub: '5-min candles' },
  { id: 'swing',    icon: '📈', label: 'Swing',    sub: '1-day candles' },
  { id: 'longterm', icon: '📊', label: 'Long-term',sub: 'Weekly candles' },
];

const CONFIDENCE_OPTS = [
  { value: 95, icon: '🔥', label: '≥95%', tier: 'ELITE',  cls: 'conf-elite' },
  { value: 90, icon: '⚡', label: '≥90%', tier: 'HIGH',   cls: 'conf-high'  },
  { value: 80, icon: '✓',  label: '≥80%', tier: 'STRONG', cls: 'conf-strong'},
];

const PRICE_OPTS = [
  { value: 50,       label: 'Under $50'  },
  { value: 100,      label: 'Under $100' },
  { value: 200,      label: 'Under $200' },
  { value: Infinity, label: 'Any Price'  },
];

export function FilterBar({
  activeMarkets, onMarketsChange,
  timeframe, onTimeframeChange,
  confidenceMin, onConfidenceChange,
  maxPrice, onMaxPriceChange,
  isOpen: panelOpen, onToggle,
}) {
  const toggleMarket = (id) =>
    onMarketsChange(prev =>
      prev.includes(id)
        ? prev.length > 1 ? prev.filter(m => m !== id) : prev
        : [...prev, id]
    );

  return (
    <div className={`filter-bar ${panelOpen ? 'expanded' : 'collapsed'}`}>
      <button className="filter-bar-toggle" onClick={onToggle}>
        <span className="filter-toggle-icon">⚙</span>
        <span>Filters</span>
        <span className="filter-summary">
          {activeMarkets.join(' · ')} · {confidenceMin}%+ · {maxPrice === Infinity ? 'Any' : `<$${maxPrice}`} · {timeframe}
        </span>
        <span className="filter-caret">{panelOpen ? '▲' : '▼'}</span>
      </button>

      {panelOpen && (
        <div className="filter-body">
          {/* Market */}
          <FilterGroup label="Market" tip="Select which stock exchange(s) to scan for signals">
            {MARKETS.map(m => {
              const open = m.isOpen();
              const cd   = m.cd();
              const active = activeMarkets.includes(m.id);
              return (
                <button key={m.id}
                  className={`fchip market-chip ${active ? 'active' : ''} ${open ? 'mkt-live' : ''}`}
                  onClick={() => toggleMarket(m.id)}>
                  <span className={`mkt-dot ${open ? 'live' : ''}`} />
                  {m.flag} {m.label}
                  <span className="mkt-cd">{open ? 'Live' : formatCountdown(cd.mins)}</span>
                </button>
              );
            })}
          </FilterGroup>

          {/* Timeframe */}
          <FilterGroup label="Timeframe" tip="Intraday = same-day trades (5-min charts). Swing = days to weeks (daily charts). Long-term = weeks to months (weekly charts).">
            {TIMEFRAMES.map(t => (
              <button key={t.id}
                className={`fchip ${timeframe === t.id ? 'active' : ''}`}
                onClick={() => onTimeframeChange(t.id)}
                title={t.sub}>
                {t.icon} {t.label}
              </button>
            ))}
          </FilterGroup>

          {/* Confidence */}
          <FilterGroup label="Min. Confidence" tip="ELITE ≥95%: ultra-rare, highest conviction. HIGH ≥90%: strong multi-indicator alignment. STRONG ≥80%: more signals, slightly lower certainty.">
            {CONFIDENCE_OPTS.map(c => (
              <button key={c.value}
                className={`fchip ${c.cls} ${confidenceMin === c.value ? 'active' : ''}`}
                onClick={() => onConfidenceChange(c.value)}>
                {c.icon} {c.label} <span className="tier-tag">{c.tier}</span>
              </button>
            ))}
          </FilterGroup>

          {/* Max Price */}
          <FilterGroup label="Max Stock Price" tip="Only show stocks below this price. Lower prices = smaller capital needed per trade.">
            {PRICE_OPTS.map(p => (
              <button key={p.value}
                className={`fchip ${maxPrice === p.value ? 'active' : ''}`}
                onClick={() => onMaxPriceChange(p.value)}>
                {p.label}
              </button>
            ))}
          </FilterGroup>
        </div>
      )}
    </div>
  );
}
