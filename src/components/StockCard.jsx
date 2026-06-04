import { fmtPrice, fmtPct } from '../utils/formatters.js';

function ConfidenceBadge({ value }) {
  const color = value >= 97 ? '#ff6b35' : value >= 95 ? '#f59e0b' : '#10b981';
  return (
    <div className="confidence-badge" style={{ '--conf-color': color }}>
      <svg viewBox="0 0 36 36" className="conf-ring">
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1f2937" strokeWidth="3" />
        <circle
          cx="18" cy="18" r="15.9" fill="none"
          stroke={color} strokeWidth="3"
          strokeDasharray={`${value} ${100 - value}`}
          strokeDashoffset="25"
          strokeLinecap="round"
        />
      </svg>
      <span className="conf-value">{value}%</span>
    </div>
  );
}

function RRBar({ ratio }) {
  const pct = Math.min((ratio / 5) * 100, 100);
  return (
    <div className="rr-bar-wrap">
      <div className="rr-bar">
        <div className="rr-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="rr-label">1:{ratio.toFixed(1)}</span>
    </div>
  );
}

export function StockCard({ signal, quote, onOpen }) {
  const up = (quote?.changePct ?? 0) >= 0;
  const riskPct = ((signal.risk / signal.entryPrice) * 100).toFixed(1);
  const rewardPct = ((signal.reward / signal.entryPrice) * 100).toFixed(1);

  return (
    <div className="stock-card" onClick={onOpen}>
      <div className="card-top">
        <div className="card-symbol-block">
          <span className="card-symbol">{signal.symbol}</span>
          <span className="card-name">{quote?.name ?? signal.symbol}</span>
        </div>
        <ConfidenceBadge value={signal.confidence} />
      </div>

      <div className="card-price-row">
        <span className="card-price">{fmtPrice(signal.entryPrice)}</span>
        <span className={`card-change ${up ? 'green' : 'red'}`}>
          {fmtPct(quote?.changePct)}
        </span>
      </div>

      <div className="card-patterns">
        {signal.patterns.slice(0, 2).map(p => (
          <span key={p} className="pattern-tag">{p}</span>
        ))}
      </div>

      <div className="card-levels">
        <div className="level entry">
          <span className="level-label">Entry</span>
          <span className="level-value blue">{fmtPrice(signal.entryPrice)}</span>
        </div>
        <div className="level stop">
          <span className="level-label">Stop</span>
          <span className="level-value red">{fmtPrice(signal.stopLoss)}</span>
          <span className="level-pct red">−{riskPct}%</span>
        </div>
        <div className="level target">
          <span className="level-label">Target</span>
          <span className="level-value green">{fmtPrice(signal.target)}</span>
          <span className="level-pct green">+{rewardPct}%</span>
        </div>
      </div>

      <div className="card-rr">
        <span className="rr-title">Risk / Reward</span>
        <RRBar ratio={signal.rrRatio} />
      </div>

      <button className="view-chart-btn" onClick={(e) => { e.stopPropagation(); onOpen(); }}>
        View Chart & Analysis →
      </button>
    </div>
  );
}
