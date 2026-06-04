import { useState, useEffect } from 'react';
import { TradingChart }  from './TradingChart.jsx';
import { CompanyInfo }   from './CompanyInfo.jsx';
import { NewsPanel }     from './NewsPanel.jsx';
import { fetchCandles, fetchCompanyInfo, fetchNews } from '../services/stockService.js';
import { generateDemoCandles } from '../data/demoSignal.js';
import { fmtPrice, fmtPct } from '../utils/formatters.js';

const TABS = ['Chart', 'Company', 'News'];

const TIER_COLOR = { ELITE: 'var(--elite-color)', HIGH: 'var(--high-color)', STRONG: 'var(--strong-color)' };

export function StockDetailModal({ signal, quote, isFavorite, onClose, onToggleFavorite }) {
  const [tab,     setTab]     = useState('Chart');
  const [candles, setCandles] = useState([]);
  const [info,    setInfo]    = useState(null);
  const [news,    setNews]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const up = (quote?.changePct ?? 0) >= 0;

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null); setCandles([]); setInfo(null); setNews(null);
    async function load() {
      try {
        if (signal.isDemo) {
          setCandles(generateDemoCandles());
          setLoading(false);
          return;
        }
        const [c, inf, nws] = await Promise.all([
          fetchCandles(signal.symbol),
          fetchCompanyInfo(signal.symbol),
          fetchNews(signal.symbol),
        ]);
        if (cancelled) return;
        setCandles(c); setInfo(inf); setNews(nws);
      } catch (e) {
        if (!cancelled) setError('Could not load data. Check network / CORS proxy.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [signal.symbol, signal.isDemo]);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const riskPct   = ((signal.risk   / signal.entryPrice) * 100).toFixed(2);
  const rewardPct = ((signal.reward / signal.entryPrice) * 100).toFixed(2);
  const tierColor = TIER_COLOR[signal.tier] ?? TIER_COLOR.STRONG;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <div style={{ flex: 1 }}>
            <div className="modal-symbol-row">
              <span className="modal-symbol">{signal.symbol}</span>
              <span className="modal-market-tag">{signal.market}</span>
              {signal.isDemo && <span className="demo-tag">DEMO</span>}
            </div>
            <div className="modal-name">{quote?.name ?? signal.name ?? signal.symbol}</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span className="modal-price">{fmtPrice(signal.entryPrice)}</span>
              <span className={`modal-change ${up ? 'green' : 'red'}`}>{fmtPct(quote?.changePct)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="modal-conf" style={{ color: tierColor }}>{signal.confidence}% {signal.tier}</span>
            </div>
          </div>

          <div className="modal-actions">
            <button
              className={`modal-fav-btn ${isFavorite ? 'faved' : ''}`}
              onClick={() => onToggleFavorite?.(signal.symbol)}
              title={isFavorite ? 'Remove from favourites' : 'Add to favourites'}
            >
              {isFavorite ? '★' : '☆'}
            </button>
            <button className="modal-close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Signal stats bar */}
        <div className="signal-bar">
          {[
            { label: 'Entry',     val: fmtPrice(signal.entryPrice), cls: 'blue' },
            { label: 'Stop Loss', val: fmtPrice(signal.stopLoss),   cls: 'red',   sub: `−${riskPct}%` },
            { label: 'Target',    val: fmtPrice(signal.target),     cls: 'green', sub: `+${rewardPct}%` },
            { label: 'R:R Ratio', val: `1:${signal.rrRatio.toFixed(1)}` },
          ].map((s, i) => (
            <div key={i} className="sig-stat">
              <span className="sig-label">{s.label}</span>
              <span className={`sig-val ${s.cls ?? ''}`}>{s.val}</span>
              {s.sub && <span className={`sig-sub ${s.cls}`}>{s.sub}</span>}
            </div>
          ))}

          <div className="sig-stat patterns-stat">
            <span className="sig-label">Patterns</span>
            <div className="sig-tags">
              {signal.patterns.map(p => <span key={p} className="sig-ptag">{p}</span>)}
            </div>
          </div>

          <div className="sig-stat signals-stat">
            <span className="sig-label">Indicators</span>
            <div className="sig-tags">
              {signal.technicalSignals.map(s => <span key={s} className="sig-itag">{s}</span>)}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="modal-tabs">
          {TABS.map(t => (
            <button key={t} className={`modal-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>

        <div className="modal-body">
          {error && <div className="error-banner">{error}</div>}

          {tab === 'Chart' && (
            <div className="chart-wrap">
              {loading ? (
                <div className="chart-loading">
                  <div className="spinner-indigo" />
                  <span>Loading chart…</span>
                </div>
              ) : candles.length === 0 ? (
                <div className="chart-loading">No intraday data available</div>
              ) : (
                <TradingChart candles={candles} signal={signal} />
              )}
            </div>
          )}

          {tab === 'Company' && <div className="tab-scroll"><CompanyInfo info={info} quote={quote} /></div>}
          {tab === 'News'    && <div className="tab-scroll"><NewsPanel news={news} symbol={signal.symbol} /></div>}
        </div>
      </div>
    </div>
  );
}
