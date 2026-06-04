import { fmtNum, fmtPrice } from '../utils/formatters.js';

const Row = ({ label, value }) =>
  value ? (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className="info-value">{value}</span>
    </div>
  ) : null;

export function CompanyInfo({ info, quote }) {
  if (!info && !quote) return <div className="panel-empty">Loading company data…</div>;

  const recColor = {
    buy:          '#10b981',
    'strong_buy': '#10b981',
    hold:         '#f59e0b',
    sell:         '#ef4444',
    'strong_sell':'#ef4444',
  };

  return (
    <div className="company-info">
      {info?.description && (
        <p className="company-desc">{info.description}</p>
      )}
      <div className="info-grid">
        <Row label="Sector"        value={info?.sector} />
        <Row label="Industry"      value={info?.industry} />
        <Row label="Country"       value={info?.country} />
        <Row label="Employees"     value={info?.employees ? fmtNum(info.employees) : null} />
        <Row label="Market Cap"    value={info?.marketCap ? fmtNum(info.marketCap) : null} />
        <Row label="P/E Ratio"     value={info?.pe ? info.pe.toFixed(1) : null} />
        <Row label="Analyst Target" value={info?.targetPrice ? fmtPrice(info.targetPrice) : null} />
        <Row label="52-wk High"    value={quote?.high ? fmtPrice(quote.high) : null} />
        <Row label="52-wk Low"     value={quote?.low  ? fmtPrice(quote.low)  : null} />
        <Row label="Volume"        value={quote?.volume ? fmtNum(quote.volume) : null} />
        {info?.website && (
          <div className="info-row">
            <span className="info-label">Website</span>
            <a
              href={info.website}
              target="_blank"
              rel="noopener noreferrer"
              className="info-link"
              onClick={e => e.stopPropagation()}
            >
              {info.website.replace(/^https?:\/\//, '')}
            </a>
          </div>
        )}
        {info?.recommendation && (
          <div className="info-row">
            <span className="info-label">Analyst Rating</span>
            <span
              className="info-value"
              style={{ color: recColor[info.recommendation] ?? '#9ca3af', fontWeight: 700 }}
            >
              {info.recommendation.replace('_', ' ').toUpperCase()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
