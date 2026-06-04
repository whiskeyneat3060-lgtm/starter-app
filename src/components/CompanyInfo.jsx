import { fmtNum, fmtPrice } from '../utils/formatters.js';

const recColor = {
  buy: '#059669', strong_buy: '#059669',
  hold: '#d97706', sell: '#dc2626', strong_sell: '#dc2626',
};

const Row = ({ label, value }) =>
  value ? (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className="info-value">{value}</span>
    </div>
  ) : null;

export function CompanyInfo({ info, quote }) {
  if (!info && !quote) return <div className="panel-empty">Loading company data…</div>;
  return (
    <div className="company-info">
      {info?.description && <p className="company-desc">{info.description}</p>}
      <div className="info-grid">
        <Row label="Sector"         value={info?.sector} />
        <Row label="Industry"       value={info?.industry} />
        <Row label="Country"        value={info?.country} />
        <Row label="Employees"      value={info?.employees ? fmtNum(info.employees) : null} />
        <Row label="Market Cap"     value={info?.marketCap ? fmtNum(info.marketCap) : null} />
        <Row label="P/E Ratio"      value={info?.pe ? info.pe.toFixed(1) : null} />
        <Row label="Analyst Target" value={info?.targetPrice ? fmtPrice(info.targetPrice) : null} />
        <Row label="Day High"       value={quote?.high  ? fmtPrice(quote.high)  : null} />
        <Row label="Day Low"        value={quote?.low   ? fmtPrice(quote.low)   : null} />
        <Row label="Volume"         value={quote?.volume ? fmtNum(quote.volume) : null} />
        {info?.website && (
          <div className="info-row">
            <span className="info-label">Website</span>
            <a href={info.website} target="_blank" rel="noopener noreferrer"
               className="info-link" onClick={e => e.stopPropagation()}>
              {info.website.replace(/^https?:\/\//, '')}
            </a>
          </div>
        )}
        {info?.recommendation && (
          <div className="info-row">
            <span className="info-label">Analyst Rating</span>
            <span className="info-value" style={{ color: recColor[info.recommendation] ?? '#64748b', fontWeight: 700 }}>
              {info.recommendation.replace('_', ' ').toUpperCase()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
