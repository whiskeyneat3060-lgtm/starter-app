import { useState, useEffect, useCallback, useRef } from 'react';
import { StockCard }          from './StockCard.jsx';
import { StockDetailModal }   from './StockDetailModal.jsx';
import { FilterBar }          from './FilterBar.jsx';
import { NASDAQ_STOCKS }      from '../data/nasdaqStocks.js';
import { EURONEXT_STOCKS }    from '../data/euronextStocks.js';
import { DEMO_SIGNAL, DEMO_QUOTE } from '../data/demoSignal.js';
import { fetchBatchQuotes, fetchCandles } from '../services/stockService.js';
import { generateSignal }     from '../services/signalService.js';

const RESCAN_MS   = 5 * 60 * 1000;
const CONCURRENCY = 8;

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
  activeMarkets, onMarketsChange,
  confidenceMin, onConfidenceChange,
  timeframe, onTimeframeChange,
  maxPrice, onMaxPriceChange,
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
  const [filterOpen, setFilterOpen] = useState(false);
  const scanningRef = useRef(false);
  const timeframeRef = useRef(timeframe);
  const confidenceRef = useRef(confidenceMin);
  const maxPriceRef = useRef(maxPrice);
  const marketsRef = useRef(activeMarkets);

  useEffect(() => { timeframeRef.current   = timeframe; },   [timeframe]);
  useEffect(() => { confidenceRef.current  = confidenceMin; }, [confidenceMin]);
  useEffect(() => { maxPriceRef.current    = maxPrice; },    [maxPrice]);
  useEffect(() => { marketsRef.current     = activeMarkets; }, [activeMarkets]);

  const runScan = useCallback(async () => {
    if (scanningRef.current) return;
    scanningRef.current = true;
    setScanning(true);
    onScanStart?.();
    setProgress(5);
    setProgLabel('Building stock list…');

    const curMarkets    = marketsRef.current;
    const curConfidence = confidenceRef.current;
    const curMaxPrice   = maxPriceRef.current;
    const curTimeframe  = timeframeRef.current;

    try {
      const allStocks = [
        ...(curMarkets.includes('NASDAQ')   ? NASDAQ_STOCKS.map(s => ({ ...s, market: 'NASDAQ' }))    : []),
        ...(curMarkets.includes('EURONEXT') ? EURONEXT_STOCKS.map(s => ({ ...s, market: 'EURONEXT' })) : []),
      ];

      setProgLabel(`Fetching quotes for ${allStocks.length} stocks…`);
      const allQuotes = await fetchBatchQuotes(allStocks.map(s => s.symbol));
      setQuotes(allQuotes);
      setProgress(25);

      const priceLimit = curMaxPrice === Infinity ? Infinity : curMaxPrice;
      const filtered = allStocks.filter(s => {
        const q = allQuotes[s.symbol];
        return q && q.price > 0 && q.price <= priceLimit;
      });

      setProgLabel(`Analysing ${filtered.length} stocks…`);
      const found = [];
      let done = 0;
      const total = filtered.length;

      await pooledMap(filtered, async (stock) => {
        try {
          const candles = await fetchCandles(stock.symbol, curTimeframe);
          if (candles.length >= 35) {
            const sig = generateSignal(stock.symbol, candles, stock.market, curConfidence, curTimeframe);
            if (sig) {
              const enriched = { ...sig, name: stock.name };
              found.push(enriched);
              addToHistory?.(enriched);
              // atomic snapshot to avoid race between 8 concurrent workers
              const snapshot = found.slice().sort((a, b) => b.confidence - a.confidence);
              setSignals(snapshot);
            }
          }
        } finally {
          done++;
          setProgress(25 + Math.round((done / total) * 72));
          setProgLabel(`Scanning ${stock.symbol}… (${done}/${total})`);
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
  }, [onScanStart, onScanEnd, addToHistory]);

  useEffect(() => { registerTrigger?.(runScan); }, [registerTrigger, runScan]);

  // Initial scan + auto-rescan timer
  useEffect(() => {
    runScan();
    const id = setInterval(runScan, RESCAN_MS);
    return () => clearInterval(id);
  }, []); // eslint-disable-line

  // Re-scan when timeframe or markets change (clear stale results first)
  const prevTimeframeRef = useRef(timeframe);
  useEffect(() => {
    if (prevTimeframeRef.current === timeframe) return;
    prevTimeframeRef.current = timeframe;
    setSignals([]);
    runScan();
  }, [timeframe, runScan]);

  const prevMarketsRef = useRef(activeMarkets.join(','));
  useEffect(() => {
    const key = activeMarkets.join(',');
    if (prevMarketsRef.current === key) return;
    prevMarketsRef.current = key;
    setSignals([]);
    runScan();
  }, [activeMarkets, runScan]);

  const visible = signals
    .filter(s =>
      s.confidence >= confidenceMin &&
      activeMarkets.includes(s.market) &&
      (maxPrice === Infinity || s.entryPrice <= maxPrice)
    )
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
        {/* Filters */}
        <FilterBar
          activeMarkets={activeMarkets}        onMarketsChange={onMarketsChange}
          timeframe={timeframe}                onTimeframeChange={onTimeframeChange}
          confidenceMin={confidenceMin}        onConfidenceChange={onConfidenceChange}
          maxPrice={maxPrice}                  onMaxPriceChange={onMaxPriceChange}
          isOpen={filterOpen}                  onToggle={() => setFilterOpen(p => !p)}
        />

        {/* Toolbar */}
        <div className="scanner-toolbar">
          <div className="toolbar-left">
            <span className="scanner-title">Live Buy Signals</span>
            {visible.length > 0 && <span className="badge-count">{visible.length}</span>}
          </div>
          <div className="toolbar-right">
            <select className="sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="confidence">By Confidence</option>
              <option value="rr">By R:R Ratio</option>
              <option value="change">By % Change</option>
              <option value="symbol">A–Z</option>
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

        {/* Skeleton while loading */}
        {scanning && visible.length === 0 && (
          <div className="cards-grid">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="skeleton-card" style={{ animationDelay: `${i * 0.12}s` }} />
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

        {showDemo && (
          <div className="demo-notice">
            <span>ℹ️</span>
            <span>
              No live signals match current filters. The card above is a <strong>demo</strong>.
              Signals require ≥{confidenceMin}% confidence across multiple indicators.
              Auto-rescans every 5 min.
            </span>
          </div>
        )}
      </div>

      {selected && (
        <StockDetailModal
          signal={selected}
          quote={quotes[selected.symbol] ?? (selected.isDemo ? DEMO_QUOTE : null)}
          isFavorite={favorites.includes(selected.symbol)}
          timeframe={timeframe}
          onClose={() => setSelected(null)}
          onToggleFavorite={onToggleFavorite}
        />
      )}
    </>
  );
}
