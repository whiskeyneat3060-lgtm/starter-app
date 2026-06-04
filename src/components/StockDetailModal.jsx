import { useState, useEffect } from 'react';
import { TradingChart }  from './TradingChart.jsx';
import { CompanyInfo }   from './CompanyInfo.jsx';
import { NewsPanel }     from './NewsPanel.jsx';
import { fetchCandles, fetchCompanyInfo, fetchNews } from '../services/stockService.js';
import { fmtPrice, fmtPct } from '../utils/formatters.js';

const TABS = ['Chart', 'Company', 'News'];

export function StockDetailModal({ signal, quote, onClose }) {
  const [tab,     setTab]     = useState('Chart');
  const [candles, setCandles] = useState([]);
  const [info,    setInfo]    = useState(null);
  const [news,    setNews]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const up = (quote?.changePct ?? 0) >= 0;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setCandles([]);
    setInfo(null);
    setNews(null);

    async function load() {
      try {
        const [c, inf, nws] = await Promise.all([
          fetchCandles(signal.symbol),
          fetchCompanyInfo(signal.symbol),
          fetchNews(signal.symbol),
        ]);
        if (cancelled) return;
        setCandles(c);
        setInfo(inf);
        setNews(nws);
      } catch (e) {
        if (!cancelled) setError('Could not load data. Check network / CORS proxy.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [signal.symbol]);

  // Close on Escape
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const riskPct   = ((signal.risk   / signal.entryPrice) * 100).toFixed(2);
  const rewardPct = ((signal.reward / signal.entryPrice) * 100).toFixed(2);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>

        {/* Modal header */}
        <div className="modal-header">
          <div className="modal-title-block">
            <div className="modal-symbol">{signal.symbol}</div>
            <div className="modal-name">{quote?.name ?? signal.symbol}</div>
          </div>

          <div className="modal-price-block">
            <span className="modal-price">{fmtPrice(signal.entryPrice)}</span>
            <span className={`modal-change ${up ? 'green' : 'red'}`}>
              {fmtPct(quote?.changePct)}
            </span>
          </div>

          <div className="modal-conf-block">
            <span className="modal-conf-label">Confidence</span>
            <span className="modal-conf-value">{signal.confidence}%</span>
          </div>

          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Signal stats bar */}
        <div className="signal-bar">
          <div className="sig-stat">
            <span className="sig-label">Entry</span>
            <span className="sig-val blue">{fmtPrice(signal.entryPrice)}</span>
          </div>
          <div className="sig-divider" />
          <div className="sig-stat">
            <span className="sig-label">Stop Loss</span>
            <span className="sig-val red">{fmtPrice(signal.stopLoss)}</span>
            <span className="sig-sub red">−{riskPct}%</span>
          </div>
          <div className="sig-divider" />
          <div className="sig-stat">
            <span className="sig-label">Target</span>
            <span className="sig-val green">{fmtPrice(signal.target)}</span>
            <span className="sig-sub green">+{rewardPct}%</span>
          </div>
          <div className="sig-divider" />
          <div className="sig-stat">
            <span className="sig-label">R:R Ratio</span>
            <span className="sig-val">1:{signal.rrRatio.toFixed(1)}</span>
          </div>
          <div className="sig-divider" />
          <div className="sig-stat patterns-stat">
            <span className="sig-label">Patterns</span>
            <div className="sig-patterns">
              {signal.patterns.map(p => (
                <span key={p} className="pattern-tag sm">{p}</span>
              ))}
            </div>
          </div>
          <div className="sig-divider" />
          <div className="sig-stat signals-stat">
            <span className="sig-label">Indicators</span>
            <div className="sig-signals">
              {signal.technicalSignals.map(s => (
                <span key={s} className="signal-tag">{s}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="modal-tabs">
          {TABS.map(t => (
            <button
              key={t}
              className={`modal-tab ${tab === t ? 'active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="modal-body">
          {error && <div className="error-msg">{error}</div>}

          {tab === 'Chart' && (
            <div className="chart-wrapper">
              {loading ? (
                <div className="chart-loading">
                  <div className="spinner-ring" />
                  <span>Loading chart data…</span>
                </div>
              ) : candles.length === 0 ? (
                <div className="chart-loading">No candle data available</div>
              ) : (
                <TradingChart candles={candles} signal={signal} />
              )}
            </div>
          )}

          {tab === 'Company' && (
            <div className="tab-scroll">
              <CompanyInfo info={info} quote={quote} />
            </div>
          )}

          {tab === 'News' && (
            <div className="tab-scroll">
              <NewsPanel news={news} symbol={signal.symbol} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
