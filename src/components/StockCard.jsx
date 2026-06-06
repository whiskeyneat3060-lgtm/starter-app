import { fmtPrice, fmtPct, timeAgo } from '../utils/formatters.js';

const TIER_META = {
  ELITE:  { border: 'var(--elite-border)',  accent: 'var(--elite-color)',  icon: '🔥', bg: 'var(--elite-bg)'  },
  HIGH:   { border: 'var(--high-border)',   accent: 'var(--high-color)',   icon: '⚡', bg: 'var(--high-bg)'   },
  STRONG: { border: 'var(--strong-border)', accent: 'var(--strong-color)', icon: '✓',  bg: 'var(--strong-bg)' },
};

const TF_ICONS = { intraday: '⚡', swing: '📈', longterm: '📊' };

export function StockCard({ signal, quote, isFavorite, onOpen, onToggleFavorite }) {
  const tier = TIER_META[signal.tier] ?? TIER_META.STRONG;
  const up   = (quote?.changePct ?? 0) >= 0;
  const riskPct   = signal.entryPrice > 0 ? ((signal.risk   / signal.entryPrice) * 100).toFixed(1) : '0.0';
  const rewardPct = signal.entryPrice > 0 ? ((signal.reward / signal.entryPrice) * 100).toFixed(1) : '0.0';
  const rrPct = Math.min((signal.rrRatio / 5) * 100, 100);
  const tfIcon = TF_ICONS[signal.timeframe] ?? '⚡';

  const handleFav = (e) => { e.stopPropagation(); onToggleFavorite?.(signal.symbol); };

  return (
    <article
      className={`stock-card ${signal.isDemo ? 'demo-card' : ''}`}
      style={{ background: tier.bg, '--tier-accent': tier.accent }}
      onClick={onOpen}
    >
      {signal.isDemo && <div className="demo-ribbon">DEMO</div>}

      {/* Header */}
      <div className="sc-head">
        <div className="sc-id">
          <div className="sc-sym-row">
            <span className="sc-symbol">{signal.symbol}</span>
            <span className="sc-mkt-tag">{signal.market !== 'SEARCH' ? signal.market : ''}</span>
            {signal.isDemo && <span className="sc-demo-tag">Demo</span>}
          </div>
          <span className="sc-name">{quote?.name ?? signal.name ?? signal.symbol}</span>
        </div>

        <div className="sc-conf" style={{ color: tier.accent }}>
          <span className="sc-tier-icon">{tier.icon}</span>
          <span className="sc-pct">{signal.confidence}%</span>
          <span className="sc-tier">{signal.tier}</span>
        </div>
      </div>

      {/* Price row */}
      <div className="sc-price-row">
        <span className="sc-price">{fmtPrice(signal.entryPrice)}</span>
        <span className={`sc-chg ${up ? 'up' : 'dn'}`}>
          {up ? '▲' : '▼'} {fmtPct(quote?.changePct)}
        </span>
        <span className="sc-tf">{tfIcon} {signal.timeframeLabel ?? 'Intraday'}</span>
        <span className="sc-age">{timeAgo(signal.timestamp)}</span>
      </div>

      {/* Patterns */}
      {signal.patterns.length > 0 && (
        <div className="sc-tags">
          {signal.patterns.slice(0, 2).map(p => (
            <span key={p} className="sc-ptag">{p}</span>
          ))}
          {signal.patterns.length > 2 && (
            <span className="sc-ptag sc-ptag-more">+{signal.patterns.length - 2}</span>
          )}
        </div>
      )}

      <div className="sc-divider" />

      {/* Trade levels */}
      <div className="sc-levels">
        <div className="sc-lvl">
          <span className="lvl-l">Entry</span>
          <span className="lvl-v entry-v">{fmtPrice(signal.entryPrice)}</span>
        </div>
        <div className="sc-lvl">
          <span className="lvl-l">Stop</span>
          <span className="lvl-v stop-v">{fmtPrice(signal.stopLoss)}</span>
          <span className="lvl-s red">−{riskPct}%</span>
        </div>
        <div className="sc-lvl">
          <span className="lvl-l">Target</span>
          <span className="lvl-v tgt-v">{fmtPrice(signal.target)}</span>
          <span className="lvl-s green">+{rewardPct}%</span>
        </div>
      </div>

      {/* R:R bar */}
      <div className="sc-rr-row">
        <span className="rr-lbl">R:R</span>
        <div className="rr-track">
          <div className="rr-fill" style={{ width: `${rrPct}%` }} />
        </div>
        <span className="rr-val">1:{signal.rrRatio.toFixed(1)}</span>
      </div>

      {/* Indicator chips */}
      {signal.technicalSignals?.length > 0 && (
        <div className="sc-inds">
          {signal.technicalSignals.slice(0, 2).map(s => (
            <span key={s} className="sc-itag">{s}</span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="sc-actions">
        <button
          className={`sc-fav-btn ${isFavorite ? 'faved' : ''}`}
          onClick={handleFav}
          title={isFavorite ? 'Remove from saved' : 'Save'}
        >
          {isFavorite ? '★' : '☆'}
        </button>
        <button className="sc-view-btn" onClick={(e) => { e.stopPropagation(); onOpen(); }}>
          Chart &amp; Analysis →
        </button>
      </div>
    </article>
  );
}
