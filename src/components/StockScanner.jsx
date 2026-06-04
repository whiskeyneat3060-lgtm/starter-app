import { useState, useEffect, useCallback, useRef } from 'react';
import { StockCard }          from './StockCard.jsx';
import { StockDetailModal }   from './StockDetailModal.jsx';
import { NASDAQ_STOCKS }      from '../data/nasdaqStocks.js';
import { EURONEXT_STOCKS }    from '../data/euronextStocks.js';
import { DEMO_SIGNAL, DEMO_QUOTE } from '../data/demoSignal.js';
import { fetchBatchQuotes, fetchCandles } from '../services/stockService.js';
import { generateSignal }     from '../services/signalService.js';

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

export function StockScanner({
  activeMarkets, confidenceMin,
  favorites, onToggleFavorite,
  onScanStart, onScanEnd,
  registerTrigger,
  addToHistory,
}) {
  const [scanning,  setScanning]  = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [progLabel, setProgLabel] = useState('');
  const [signals,   setSignals]   = useState([]);
  const [quotes,    setQuotes]    = useState({});
  const [selected,  setSelected]  = useState(null);
  const [sortBy,    setSortBy]    = useState('confidence');
  const scanningRef = useRef(false);

  const runScan = useCallback(async () => {
    if (scanningRef.current) return;
    scanningRef.current = true;
    setScanning(true);
    onScanStart?.();
    setProgress(5);
    setProgLabel('Building stock list…');

    try {
      const allStocks = [
        ...(activeMarkets.includes('NASDAQ')   ? NASDAQ_STOCKS.map(s => ({ ...s, market: 'NASDAQ' }))   : []),
        ...(activeMarkets.includes('EURONEXT') ? EURONEXT_STOCKS.map(s => ({ ...s, market: 'EURONEXT' })) : []),
      ];

      setProgLabel(`Fetching quotes for ${allStocks.length} stocks…`);
      const allQuotes = await fetchBatchQuotes(allStocks.map(s => s.symbol));
      setQuotes(allQuotes);
      setProgress(25);

      const filtered = allStocks.filter(s => {
        const q = allQuotes[s.symbol];
        return q && q.price > 0 && q.price < PRICE_MAX;
      });

      setProgLabel(`Analysing ${filtered.length} stocks (under $${PRICE_MAX})…`);

      const found = [];
      let done = 0;
      const total = filtered.length;

      await pooledMap(filtered, async (stock) => {
        try {
          const candles = await fetchCandles(stock.symbol);
          if (candles.length >= 35) {
            const sig = generateSignal(stock.symbol, candles, stock.market, confidenceMin);
            if (sig) {
              const enriched = { ...sig, name: stock.name };
              found.push(enriched);
              addToHistory?.(enriched);
            }
          }
        } finally {
          done++;
          setProgress(25 + Math.round((done / total) * 72));
          setProgLabel(`${stock.symbol} (${done}/${total})`);
        }
      }, CONCURRENCY);

      setProgress(100);
      const sorted = found.sort((a, b) => b.confidence - a.confidence);
      setSignals(sorted);
      onScanEnd?.(sorted.length, total, new Date());
    } catch (e) {
      console.error('Scan error', e);
      onScanEnd?.(0, 0, new Date());
    } finally {
      scanningRef.current = false;
      setScanning(false);
      setTimeout(() => setProgress(0), 1800);
    }
  }, [activeMarkets, confidenceMin, onScanStart, onScanEnd, addToHistory]);

  useEffect(() => {
    registerTrigger?.(runScan);
  }, [registerTrigger, runScan]);

  useEffect(() => {
    runScan();
    const id = setInterval(runScan, RESCAN_MS);
    return () => clearInterval(id);
  }, []); // eslint-disable-line

  // Filter signals by confidence and active market
  const visible = signals
    .filter(s => s.confidence >= confidenceMin && activeMarkets.includes(s.market))
    .sort((a, b) => {
      if (sortBy === 'confidence') return b.confidence - a.confidence;
      if (sortBy === 'rr')         return b.rrRatio - a.rrRatio;
      if (sortBy === 'change')     return (quotes[b.symbol]?.changePct ?? 0) - (quotes[a.symbol]?.changePct ?? 0);
      return a.symbol.localeCompare(b.symbol);
    });

  const showDemo = !scanning && visible.length === 0;

  return (
    <>
      <div className="scanner-content">
        <div className="scanner-toolbar">
          <div className="toolbar-left">
            <span className="scanner-title">Live Buy Signals</span>
            {visible.length > 0 && <span className="badge-active">{visible.length} active</span>}
          </div>
          <div className="toolbar-right">
            <span className="sort-label">Sort</span>
            <select className="sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="confidence">Confidence</option>
              <option value="rr">R:R Ratio</option>
              <option value="change">% Change</option>
              <option value="symbol">Symbol A–Z</option>
            </select>
          </div>
        </div>

        {/* Progress */}
        {scanning && (
          <div className="progress-wrap">
            <div className="progress-rail">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="progress-label">{progLabel}</span>
          </div>
        )}

        {/* Skeleton */}
        {scanning && visible.length === 0 && (
          <div className="cards-grid">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton-card" style={{ animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        )}

        {/* Signal cards */}
        <div className="cards-grid">
          {visible.map(sig => (
            <StockCard
              key={sig.symbol}
              signal={sig}
              quote={quotes[sig.symbol]}
              isFavorite={favorites.includes(sig.symbol)}
              onOpen={() => setSelected(sig)}
              onToggleFavorite={onToggleFavorite}
            />
          ))}

          {/* Demo card when no signals */}
          {showDemo && (
            <StockCard
              signal={DEMO_SIGNAL}
              quote={DEMO_QUOTE}
              isFavorite={false}
              onOpen={() => setSelected(DEMO_SIGNAL)}
              onToggleFavorite={() => {}}
            />
          )}
        </div>

        {/* Empty explanation */}
        {showDemo && (
          <div className="demo-notice">
            <span className="demo-notice-icon">ℹ️</span>
            <span>
              No live signals match the current filter. The card above is a <strong>demo signal</strong> showing how results will appear.
              Signals require ≥{confidenceMin}% confidence — multiple indicators must align simultaneously.
              Auto-rescans every 5 min.
            </span>
          </div>
        )}
      </div>

      {selected && (
        <StockDetailModal
          signal={selected}
          quote={quotes[selected.symbol] ?? DEMO_QUOTE}
          isFavorite={favorites.includes(selected.symbol)}
          onClose={() => setSelected(null)}
          onToggleFavorite={onToggleFavorite}
        />
      )}
    </>
  );
}
