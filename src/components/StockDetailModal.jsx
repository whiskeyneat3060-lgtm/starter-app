import { useState, useEffect } from 'react';
import { TradingChart }  from './TradingChart.jsx';
import { CompanyInfo }   from './CompanyInfo.jsx';
import { NewsPanel }     from './NewsPanel.jsx';
import { fetchCandles, fetchCompanyInfo, fetchNews } from '../services/stockService.js';
import { generateDemoCandles } from '../data/demoSignal.js';
import { fmtPrice, fmtPct } from '../utils/formatters.js';

const TABS = ['Chart', 'Company', 'News'];
const TIER_COLOR = { ELITE: 'var(--elite-color)', HIGH: 'var(--high-color)', STRONG: 'var(--strong-color)' };
const TF_LABELS  = { intraday: '⚡ Intraday', swing: '📈 Swing', longterm: '📊 Long-term' };

export function StockDetailModal({ signal, quote, isFavorite, onClose, onToggleFavorite, timeframe = 'intraday' }) {
  const [tab,     setTab]     = useState('Chart');
  const [candles, setCandles] = useState([]);
  const [info,    setInfo]    = useState(null);
  const [news,    setNews]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const up = (quote?.changePct ?? 0) >= 0;
  const isSearch = signal.isSearchResult;
  const tf = signal.timeframe ?? timeframe;

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
          fetchCandles(signal.symbol, tf),
          fetchCompanyInfo(signal.symbol),
          fetchNews(signal.symbol),
        ]);
        if (cancelled) return;
        setCandles(c); setInfo(inf); setNews(nws);
      } catch {
        if (!cancelled) setError('Could not load data — check network / CORS proxy.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [signal.symbol, signal.isDemo, tf]);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const riskPct   = signal.entryPrice > 0 ? ((signal.risk   / signal.entryPrice) * 100).toFixed(2) : '0.00';
  const rewardPct = signal.entryPrice > 0 ? ((signal.reward / signal.entryPrice) * 100).toFixed(2) : '0.00';
  const tierColor = TIER_COLOR[signal.tier] ?? TIER_COLOR.STRONG;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-hdr">
          <div className="modal-hdr-info">
            <div className="modal-sym-row">
              <span className="modal-sym">{signal.symbol}</span>
              {signal.market && signal.market !== 'SEARCH' && (
                <span className="modal-mkt-tag">{signal.market}</span>
              )}
              {signal.isDemo && <span className="modal-demo-tag">DEMO</span>}
              {isSearch && <span className="modal-search-tag">SEARCH</span>}
              <span className="modal-tf-tag">{TF_LABELS[tf] ?? TF_LABELS.intraday}</span>
            </div>
            <div className="modal-name">{quote?.name ?? signal.name ?? signal.symbol}</div>
          </div>

          <div className="modal-hdr-price">
            <div className="modal-price-row">
              <span className="modal-price">{fmtPrice(signal.entryPrice || quote?.price || 0)}</span>
              <span className={`modal-chg ${up ? 'green' : 'red'}`}>{fmtPct(quote?.changePct)}</span>
            </div>
            {!isSearch && (
              <div className="modal-conf-row" style={{ color: tierColor }}>
                <span>{signal.confidence}%</span>
                <span className="modal-tier">{signal.tier}</span>
              </div>
            )}
          </div>

          <div className="modal-hdr-btns">
            <button
              className={`modal-fav-btn ${isFavorite ? 'faved' : ''}`}
              onClick={() => onToggleFavorite?.(signal.symbol)}
              title={isFavorite ? 'Remove from saved' : 'Save to favourites'}
            >
              {isFavorite ? '★' : '☆'}
            </button>
            <button className="modal-close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Signal stats bar — hidden for search results with no signal data */}
        {!isSearch && signal.entryPrice > 0 && (
          <div className="signal-bar">
            <div className="sig-stat">
              <span className="sig-lbl">Entry</span>
              <span className="sig-val blue">{fmtPrice(signal.entryPrice)}</span>
            </div>
            <div className="sig-stat">
              <span className="sig-lbl">Stop</span>
              <span className="sig-val red">{fmtPrice(signal.stopLoss)}</span>
              <span className="sig-sub red">−{riskPct}%</span>
            </div>
            <div className="sig-stat">
              <span className="sig-lbl">Target</span>
              <span className="sig-val green">{fmtPrice(signal.target)}</span>
              <span className="sig-sub green">+{rewardPct}%</span>
            </div>
            <div className="sig-stat">
              <span className="sig-lbl">R:R</span>
              <span className="sig-val">1:{signal.rrRatio.toFixed(1)}</span>
            </div>

            {signal.patterns?.length > 0 && (
              <div className="sig-stat sig-wide">
                <span className="sig-lbl">Patterns</span>
                <div className="sig-tags">
                  {signal.patterns.map(p => <span key={p} className="sig-ptag">{p}</span>)}
                </div>
              </div>
            )}

            {signal.technicalSignals?.length > 0 && (
              <div className="sig-stat sig-wide">
                <span className="sig-lbl">Indicators</span>
                <div className="sig-tags">
                  {signal.technicalSignals.map(s => <span key={s} className="sig-itag">{s}</span>)}
                </div>
              </div>
            )}
          </div>
        )}

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
                <div className="chart-loading">No chart data available</div>
              ) : (
                <TradingChart candles={candles} signal={isSearch ? null : signal} />
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
