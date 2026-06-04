import { fmtPrice, fmtPct, timeAgo } from '../utils/formatters.js';

const TIER_META = {
  ELITE:  { bg: 'var(--elite-bg)',  border: 'var(--elite-border)',  accent: 'var(--elite-color)',  icon: '🔥' },
  HIGH:   { bg: 'var(--high-bg)',   border: 'var(--high-border)',   accent: 'var(--high-color)',   icon: '⚡' },
  STRONG: { bg: 'var(--strong-bg)', border: 'var(--strong-border)', accent: 'var(--strong-color)', icon: '✓'  },
};

function RRBar({ ratio }) {
  const pct = Math.min((ratio / 5) * 100, 100);
  return (
    <div className="rr-row">
      <span className="rr-label-sm">Risk:Reward</span>
      <div className="rr-track">
        <div className="rr-bar" style={{ width: `${pct}%` }} />
      </div>
      <span className="rr-value">1 : {ratio.toFixed(1)}</span>
    </div>
  );
}

export function StockCard({ signal, quote, isFavorite, onOpen, onToggleFavorite }) {
  const tier = TIER_META[signal.tier] ?? TIER_META.STRONG;
  const up   = (quote?.changePct ?? 0) >= 0;

  const riskPct   = ((signal.risk   / signal.entryPrice) * 100).toFixed(2);
  const rewardPct = ((signal.reward / signal.entryPrice) * 100).toFixed(2);

  const handleFav = (e) => {
    e.stopPropagation();
    onToggleFavorite?.(signal.symbol);
  };

  return (
    <article
      className={`stock-card ${signal.isDemo ? 'demo-card' : ''}`}
      style={{
        background:   tier.bg,
        borderColor:  tier.border,
        '--tier-accent': tier.accent,
      }}
      onClick={onOpen}
    >
      {signal.isDemo && <div className="demo-ribbon">DEMO</div>}

      {/* Top row */}
      <div className="sc-top">
        <div className="sc-identity">
          <div className="sc-symbol-row">
            <span className="sc-symbol">{signal.symbol}</span>
            <span className="sc-market-badge">{signal.market}</span>
            {signal.isDemo && <span className="sc-demo-badge">Test Signal</span>}
          </div>
          <span className="sc-name">{quote?.name ?? signal.name ?? signal.symbol}</span>
        </div>

        <div className="sc-conf-block" style={{ color: tier.accent }}>
          <span className="sc-tier-icon">{tier.icon}</span>
          <span className="sc-conf-pct">{signal.confidence}%</span>
          <span className="sc-tier-label">{signal.tier}</span>
        </div>
      </div>

      {/* Price row */}
      <div className="sc-price-row">
        <span className="sc-price">{fmtPrice(signal.entryPrice)}</span>
        <span className={`sc-change ${up ? 'up' : 'down'}`}>
          {up ? '▲' : '▼'} {fmtPct(quote?.changePct)}
        </span>
        <span className="sc-age">{timeAgo(signal.timestamp)}</span>
      </div>

      {/* Patterns */}
      <div className="sc-patterns">
        {signal.patterns.slice(0, 3).map(p => (
          <span key={p} className="sc-pattern-tag">{p}</span>
        ))}
      </div>

      <div className="sc-divider" />

      {/* Levels */}
      <div className="sc-levels">
        <div className="sc-level">
          <span className="lvl-label">Entry</span>
          <span className="lvl-val entry-val">{fmtPrice(signal.entryPrice)}</span>
        </div>
        <div className="sc-level">
          <span className="lvl-label">Stop Loss</span>
          <span className="lvl-val stop-val">{fmtPrice(signal.stopLoss)}</span>
          <span className="lvl-sub red">−{riskPct}%</span>
        </div>
        <div className="sc-level">
          <span className="lvl-label">Target</span>
          <span className="lvl-val target-val">{fmtPrice(signal.target)}</span>
          <span className="lvl-sub green">+{rewardPct}%</span>
        </div>
      </div>

      {/* Indicators */}
      <div className="sc-indicators">
        {signal.technicalSignals.slice(0, 3).map(s => (
          <span key={s} className="sc-ind-tag">{s}</span>
        ))}
      </div>

      <RRBar ratio={signal.rrRatio} />

      {/* Actions */}
      <div className="sc-actions">
        <button className={`fav-btn ${isFavorite ? 'active' : ''}`} onClick={handleFav}
          title={isFavorite ? 'Remove from favourites' : 'Save to favourites'}>
          {isFavorite ? '★' : '☆'}
          {isFavorite ? 'Saved' : 'Save'}
        </button>
        <button className="chart-btn" onClick={(e) => { e.stopPropagation(); onOpen(); }}>
          View Chart &amp; Analysis →
        </button>
      </div>
    </article>
  );
}
