import { useState, useEffect } from 'react';
import { TradingChart }  from './TradingChart.jsx';
import { CompanyInfo }   from './CompanyInfo.jsx';
import { NewsPanel }     from './NewsPanel.jsx';
import { fetchCandles, fetchCompanyInfo, fetchNews, fetchQuote } from '../services/stockService.js';
import { generateDemoCandles } from '../data/demoSignal.js';
import { fmtPrice, fmtPct } from '../utils/formatters.js';

const TABS = ['Chart', 'Company', 'News'];
const TIER_COLOR = { ELITE: 'var(--elite-color)', HIGH: 'var(--high-color)', STRONG: 'var(--strong-color)' };
const TF_LABELS  = { intraday: '⚡ Intraday', swing: '📈 Swing', longterm: '📊 Long-term' };

export function StockDetailModal({ signal, quote: propQuote, isFavorite, onClose, onToggleFavorite, timeframe = 'intraday' }) {
  const [tab,       setTab]       = useState('Chart');
  const [candles,   setCandles]   = useState([]);
  const [info,      setInfo]      = useState(null);
  const [news,      setNews]      = useState(null);
  const [liveQuote, setLiveQuote] = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  const isSearch = !!signal.isSearchResult;
  const tf = signal.timeframe ?? timeframe;
  const quote = liveQuote ?? propQuote;
  const up = (quote?.changePct ?? 0) >= 0;
  const displayPrice = signal.entryPrice > 0 ? signal.entryPrice : (quote?.price ?? 0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null); setCandles([]); setInfo(null); setNews(null); setLiveQuote(null);

    async function load() {
      try {
        if (signal.isDemo) {
          setCandles(generateDemoCandles());
          setNews([]);
          setLoading(false);
          return;
        }

        const fetches = [
          fetchCandles(signal.symbol, tf),
          fetchCompanyInfo(signal.symbol),
          fetchNews(signal.symbol),
        ];
        if (isSearch) fetches.push(fetchQuote(signal.symbol));

        const results = await Promise.allSettled(fetches);
        if (cancelled) return;

        const [cRes, infRes, nwsRes, qRes] = results;
        setCandles(cRes.status  === 'fulfilled' ? cRes.value   : []);
        setInfo   (infRes.status === 'fulfilled' ? infRes.value  : null);
        setNews   (nwsRes.status === 'fulfilled' ? nwsRes.value  : []);
        if (qRes?.status === 'fulfilled' && qRes.value) setLiveQuote(qRes.value);

        if (cRes.status === 'rejected' && infRes.status === 'rejected') {
          setError('Could not load data — CORS proxy may be down. Try again in a moment.');
        }
      } catch {
        if (!cancelled) setError('Unexpected error loading data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [signal.symbol, signal.isDemo, isSearch, tf]);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const riskPct   = signal.entryPrice > 0 ? ((signal.risk   / signal.entryPrice) * 100).toFixed(2) : null;
  const rewardPct = signal.entryPrice > 0 ? ((signal.reward / signal.entryPrice) * 100).toFixed(2) : null;
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
              {signal.isDemo   && <span className="modal-demo-tag">DEMO</span>}
              {isSearch        && <span className="modal-search-tag">SEARCH</span>}
              <span className="modal-tf-tag">{TF_LABELS[tf] ?? TF_LABELS.intraday}</span>
            </div>
            <div className="modal-name">{quote?.name ?? signal.name ?? signal.symbol}</div>
          </div>

          <div className="modal-hdr-price">
            <div className="modal-price-row">
              <span className="modal-price">{fmtPrice(displayPrice)}</span>
              {quote?.changePct != null && (
                <span className={`modal-chg ${up ? 'green' : 'red'}`}>{fmtPct(quote.changePct)}</span>
              )}
            </div>
            {!isSearch && signal.confidence > 0 && (
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

        {/* Signal stats bar */}
        {!isSearch && signal.entryPrice > 0 && (
          <div className="signal-bar">
            <div className="sig-stat">
              <span className="sig-lbl">Entry</span>
              <span className="sig-val blue">{fmtPrice(signal.entryPrice)}</span>
            </div>
            <div className="sig-stat">
              <span className="sig-lbl">Stop</span>
              <span className="sig-val red">{fmtPrice(signal.stopLoss)}</span>
              {riskPct && <span className="sig-sub red">−{riskPct}%</span>}
            </div>
            <div className="sig-stat">
              <span className="sig-lbl">Target</span>
              <span className="sig-val green">{fmtPrice(signal.target)}</span>
              {rewardPct && <span className="sig-sub green">+{rewardPct}%</span>}
            </div>
            <div className="sig-stat">
              <span className="sig-lbl">R:R</span>
              <span className="sig-val">{signal.rrRatio > 0 ? `1:${signal.rrRatio.toFixed(1)}` : '—'}</span>
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
                <div className="chart-loading">No chart data available for this period</div>
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
