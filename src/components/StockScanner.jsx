import { useState, useEffect, useCallback, useRef } from 'react';
import { StockCard }        from './StockCard.jsx';
import { StockDetailModal } from './StockDetailModal.jsx';
import { NASDAQ_STOCKS }    from '../data/nasdaqStocks.js';
import { fetchBatchQuotes, fetchCandles } from '../services/stockService.js';
import { generateSignal }   from '../services/signalService.js';

const PRICE_MAX   = 200;
const RESCAN_MS   = 5 * 60 * 1000;
const CONCURRENCY = 4;

async function pooledMap(items, fn, concurrency) {
  const queue = [...items];
  const results = [];
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      const r = await fn(item).catch(() => null);
      if (r) results.push(r);
    }
  });
  await Promise.all(workers);
  return results;
}

export function StockScanner({ onScanStart, onScanEnd, registerTrigger }) {
  const [scanning,  setScanning]  = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [progLabel, setProgLabel] = useState('');
  const [signals,   setSignals]   = useState([]);
  const [quotes,    setQuotes]    = useState({});
  const [selected,  setSelected]  = useState(null);
  const [sortBy,    setSortBy]    = useState('confidence');
  const scanningRef = useRef(false);
  const timerRef    = useRef(null);

  const runScan = useCallback(async () => {
    if (scanningRef.current) return;
    scanningRef.current = true;
    setScanning(true);
    onScanStart?.();
    setProgress(5);
    setProgLabel('Fetching real-time quotes…');

    try {
      const allSymbols = NASDAQ_STOCKS.map(s => s.symbol);
      const allQuotes  = await fetchBatchQuotes(allSymbols);
      setQuotes(allQuotes);
      setProgress(25);

      const filtered = Object.values(allQuotes)
        .filter(q => q.price > 0 && q.price < PRICE_MAX);

      setProgLabel(`Analysing ${filtered.length} stocks under $${PRICE_MAX}…`);

      const found = [];
      let done = 0;
      const total = filtered.length;

      await pooledMap(filtered, async (q) => {
        try {
          const candles = await fetchCandles(q.symbol);
          if (candles.length >= 35) {
            const sig = generateSignal(q.symbol, candles);
            if (sig) found.push(sig);
          }
        } finally {
          done++;
          setProgress(25 + Math.round((done / total) * 72));
          setProgLabel(`${q.symbol} — ${done}/${total}`);
        }
      }, CONCURRENCY);

      setProgress(100);
      const sorted = found.sort((a, b) => b.confidence - a.confidence);
      setSignals(sorted);
      const now = new Date();
      onScanEnd?.(sorted.length, now);
    } catch (e) {
      console.error('Scan failed', e);
      onScanEnd?.(0, new Date());
    } finally {
      scanningRef.current = false;
      setScanning(false);
      setTimeout(() => setProgress(0), 1800);
    }
  }, [onScanStart, onScanEnd]);

  // Register external trigger so Header button can call runScan
  useEffect(() => {
    registerTrigger?.(runScan);
  }, [registerTrigger, runScan]);

  // Auto-scan on mount + every 5 min
  useEffect(() => {
    runScan();
    timerRef.current = setInterval(runScan, RESCAN_MS);
    return () => clearInterval(timerRef.current);
  }, []); // eslint-disable-line

  const sorted = [...signals].sort((a, b) => {
    if (sortBy === 'confidence') return b.confidence - a.confidence;
    if (sortBy === 'change')     return (quotes[b.symbol]?.changePct ?? 0) - (quotes[a.symbol]?.changePct ?? 0);
    return a.symbol.localeCompare(b.symbol);
  });

  return (
    <>
      <main className="scanner-main">
        <div className="scanner-toolbar">
          <div className="toolbar-left">
            <h2 className="scanner-title">
              Live Buy Signals
              <span className="scanner-filter"> — NASDAQ · Under ${PRICE_MAX} · Confidence ≥90%</span>
            </h2>
            {signals.length > 0 && (
              <span className="signal-total">{signals.length} active</span>
            )}
          </div>
          <div className="toolbar-right">
            <label className="sort-label">Sort by</label>
            <select
              className="sort-select"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
            >
              <option value="confidence">Confidence</option>
              <option value="change">% Change</option>
              <option value="symbol">Symbol A–Z</option>
            </select>
          </div>
        </div>

        {scanning && (
          <div className="progress-wrap">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="progress-label">{progLabel}</span>
          </div>
        )}

        {!scanning && signals.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <h3>No High-Confidence Signals Right Now</h3>
            <p>
              The scanner filters for ≥90% confidence — requiring simultaneous alignment of
              candlestick pattern, RSI, MACD crossover, and volume surge.
              This is intentionally strict. Signals appear only when conditions are right.
            </p>
            <p className="empty-hint">Auto-rescans every 5 min · Click "Scan Now" to refresh immediately</p>
          </div>
        )}

        {scanning && signals.length === 0 && (
          <div className="scanning-placeholder">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton-card" style={{ animationDelay: `${i * 0.12}s` }} />
            ))}
          </div>
        )}

        <div className="cards-grid">
          {sorted.map(sig => (
            <StockCard
              key={sig.symbol}
              signal={sig}
              quote={quotes[sig.symbol]}
              onOpen={() => setSelected(sig)}
            />
          ))}
        </div>
      </main>

      {selected && (
        <StockDetailModal
          signal={selected}
          quote={quotes[selected.symbol]}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
