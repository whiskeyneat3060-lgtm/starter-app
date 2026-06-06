import { useState, useEffect, useRef } from 'react';
import { searchStocks } from '../services/stockService.js';

const QUICK_PICKS = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'AMZN', 'ASML.AS', 'LVMH.PA', 'META'];

export function StockSearch({ onClose, onSelectStock }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hi, setHi] = useState(-1);
  const inputRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!q) { setResults([]); setHi(-1); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await searchStocks(q);
        setResults(r.slice(0, 10));
        setHi(-1);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 280);
    return () => clearTimeout(t);
  }, [query]);

  const pick = (r) => { onSelectStock(r); onClose(); };

  const onKey = (e) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') { setHi(h => Math.min(h + 1, results.length - 1)); e.preventDefault(); }
    if (e.key === 'ArrowUp')   { setHi(h => Math.max(h - 1, 0)); e.preventDefault(); }
    if (e.key === 'Enter' && hi >= 0 && results[hi]) pick(results[hi]);
  };

  return (
    <div className="search-overlay" onClick={onClose}>
      <div className="search-modal" onClick={e => e.stopPropagation()}>

        <div className="search-bar-row">
          <svg className="search-glass-icon" viewBox="0 0 20 20" fill="none">
            <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M14 14l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          <input
            ref={inputRef}
            className="search-input"
            type="text"
            placeholder="Search stocks & ETFs worldwide…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKey}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          {loading && <span className="search-spin" />}
          <button className="search-x-btn" onClick={onClose}>✕</button>
        </div>

        {results.length > 0 && (
          <div className="search-results">
            {results.map((r, i) => (
              <button
                key={r.symbol}
                className={`search-row ${hi === i ? 'hl' : ''}`}
                onClick={() => pick(r)}
              >
                <div className="sr-left">
                  <span className="sr-symbol">{r.symbol}</span>
                  <span className="sr-type-badge">{r.type}</span>
                </div>
                <div className="sr-right">
                  <span className="sr-name">{r.name}</span>
                  <span className="sr-exch">{r.exchange}</span>
                </div>
                <span className="sr-arrow">›</span>
              </button>
            ))}
          </div>
        )}

        {!loading && query.length > 0 && results.length === 0 && (
          <div className="search-empty">No results for <strong>"{query}"</strong></div>
        )}

        {!query.trim() && (
          <div className="search-hints">
            <div className="search-hint-label">Quick picks</div>
            <div className="search-chips">
              {QUICK_PICKS.map(s => (
                <button key={s} className="search-chip" onClick={() => setQuery(s)}>{s}</button>
              ))}
            </div>
            <div className="search-tip">
              Search any stock or ETF on NASDAQ, NYSE, Euronext, LSE and more
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
