import { useState, useEffect } from 'react';
import { fetchBatchQuotes, fetchCandles } from '../services/stockService.js';
import { fmtPrice, fmtPct } from '../utils/formatters.js';
import { TradingChart } from './TradingChart.jsx';

function FavCard({ symbol, quote, onView, onRemove }) {
  const up = (quote?.changePct ?? 0) >= 0;
  return (
    <div className="fav-card">
      <div className="fav-card-top">
        <div>
          <span className="fav-card-sym">{symbol}</span>
          <span className="fav-card-name">{quote?.name ?? symbol}</span>
        </div>
        {quote && (
          <div style={{ textAlign: 'right' }}>
            <div className="fav-card-price">{fmtPrice(quote.price)}</div>
            <div className={`fav-card-chg ${up ? 'green' : 'red'}`}>{fmtPct(quote.changePct)}</div>
          </div>
        )}
      </div>
      <div className="fav-card-actions">
        <button className="fav-chart-btn" onClick={() => onView(symbol)}>View Chart →</button>
        <button className="fav-remove-btn" onClick={() => onRemove(symbol)}>✕ Remove</button>
      </div>
    </div>
  );
}

function MiniChart({ symbol }) {
  const [candles, setCandles] = useState(null);
  useEffect(() => {
    fetchCandles(symbol).then(setCandles).catch(() => setCandles([]));
  }, [symbol]);
  if (!candles) return <div className="chart-loading"><div className="spinner-indigo"/></div>;
  if (!candles.length) return <div className="chart-loading">No data</div>;
  return <TradingChart candles={candles} signal={null} />;
}

export function FavoritesPanel({ favorites, onRemoveFavorite }) {
  const [quotes,   setQuotes]   = useState({});
  const [chartSym, setChartSym] = useState(null);
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    if (!favorites.length) return;
    setLoading(true);
    fetchBatchQuotes(favorites)
      .then(setQuotes)
      .finally(() => setLoading(false));
  }, [favorites.join(',')]); // eslint-disable-line

  if (!favorites.length) {
    return (
      <div className="empty-state">
        <div className="empty-icon">⭐</div>
        <h3>No Favourites Yet</h3>
        <p>Click the ☆ star on any signal card to save stocks here for quick access.</p>
      </div>
    );
  }

  return (
    <div className="favorites-panel">
      <div className="fav-header">
        <h2 className="fav-title">Favourites</h2>
        {loading && <span className="loading-text">Refreshing quotes…</span>}
      </div>

      <div className="fav-grid">
        {favorites.map(sym => (
          <FavCard
            key={sym}
            symbol={sym}
            quote={quotes[sym]}
            onView={setChartSym}
            onRemove={onRemoveFavorite}
          />
        ))}
      </div>

      {chartSym && (
        <div className="fav-chart-modal" onClick={() => setChartSym(null)}>
          <div className="fav-chart-box" onClick={e => e.stopPropagation()}>
            <div className="fav-chart-header">
              <span className="fav-chart-title">{chartSym} — 5-Minute Chart</span>
              <button className="modal-close-btn" onClick={() => setChartSym(null)}>✕</button>
            </div>
            <div style={{ height: 400 }}>
              <MiniChart symbol={chartSym} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
