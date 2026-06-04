import { useState, useRef, useCallback } from 'react';
import { Header }          from './components/Header.jsx';
import { Sidebar }         from './components/Sidebar.jsx';
import { StockScanner }    from './components/StockScanner.jsx';
import { FavoritesPanel }  from './components/FavoritesPanel.jsx';
import { StockDetailModal } from './components/StockDetailModal.jsx';
import './App.css';

function useLocalStorage(key, init) {
  const [val, setVal] = useState(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : init; }
    catch { return init; }
  });
  const set = useCallback((v) => {
    const next = typeof v === 'function' ? v(val) : v;
    setVal(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
  }, [key, val]);
  return [val, set];
}

function useSessionStorage(key, init) {
  const [val, setVal] = useState(() => {
    try { const s = sessionStorage.getItem(key); return s ? JSON.parse(s) : init; }
    catch { return init; }
  });
  const set = useCallback((v) => {
    const next = typeof v === 'function' ? v(val) : v;
    setVal(next);
    try { sessionStorage.setItem(key, JSON.stringify(next)); } catch {}
  }, [key, val]);
  return [val, set];
}

export default function App() {
  const [sidebarOpen,     setSidebarOpen]     = useState(window.innerWidth >= 768);
  const [sidebarView,     setSidebarView]     = useState('scanner');
  const [activeMarkets,   setActiveMarkets]   = useState(['NASDAQ']);
  const [confidenceMin,   setConfidenceMin]   = useState(90);
  const [favorites,       setFavorites]       = useLocalStorage('ats-favorites', []);
  const [signalHistory,   setSignalHistory]   = useSessionStorage('ats-history', []);
  const [scanning,        setScanning]        = useState(false);
  const [lastScan,        setLastScan]        = useState(null);
  const [signalCount,     setSignalCount]     = useState(0);
  const [stocksScanned,   setStocksScanned]   = useState(0);
  const [historySignal,   setHistorySignal]   = useState(null);

  const scanTriggerRef = useRef(null);

  const toggleFavorite = useCallback((sym) => {
    setFavorites(prev =>
      prev.includes(sym) ? prev.filter(s => s !== sym) : [...prev, sym]
    );
  }, [setFavorites]);

  const addToHistory = useCallback((sig) => {
    setSignalHistory(prev => {
      const deduped = prev.filter(s => s.symbol !== sig.symbol);
      return [...deduped, sig].slice(-50);
    });
  }, [setSignalHistory]);

  const handleFavoriteOpen = useCallback((sym, sig) => {
    if (sig) { setHistorySignal(sig); return; }
    // Find in history or open with minimal signal
    const hist = signalHistory.find(s => s.symbol === sym);
    if (hist) setHistorySignal(hist);
    else setHistorySignal({ symbol: sym, name: sym, market: 'NASDAQ', confidence: 0, tier: 'STRONG', patterns: [], technicalSignals: [], entryPrice: 0, stopLoss: 0, target: 0, risk: 0, reward: 0, rrRatio: 0, rsi: null, timestamp: Date.now() });
  }, [signalHistory]);

  return (
    <div className={`app-root ${sidebarOpen ? 'sb-open' : 'sb-closed'}`}>
      <Sidebar
        view={sidebarView}
        onViewChange={v => { setSidebarView(v); }}
        favorites={favorites}
        signalHistory={signalHistory}
        onFavoriteOpen={handleFavoriteOpen}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(p => !p)}
      />

      <div className="app-main">
        <Header
          activeMarkets={activeMarkets}
          onMarketsChange={setActiveMarkets}
          confidenceMin={confidenceMin}
          onConfidenceChange={setConfidenceMin}
          scanning={scanning}
          lastScan={lastScan}
          signalCount={signalCount}
          stocksScanned={stocksScanned}
          onMenuToggle={() => setSidebarOpen(p => !p)}
        />

        <div className="app-content">
          {(sidebarView === 'scanner' || sidebarView === 'history') && (
            <StockScanner
              activeMarkets={activeMarkets}
              confidenceMin={confidenceMin}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
              onScanStart={() => setScanning(true)}
              onScanEnd={(count, total, time) => {
                setScanning(false);
                setSignalCount(count);
                setStocksScanned(total);
                setLastScan(time);
              }}
              registerTrigger={fn => { scanTriggerRef.current = fn; }}
              addToHistory={addToHistory}
            />
          )}

          {sidebarView === 'favorites' && (
            <FavoritesPanel
              favorites={favorites}
              onRemoveFavorite={toggleFavorite}
            />
          )}
        </div>

        {/* Big floating scan button */}
        <div className="scan-fab-wrap">
          <button
            className={`scan-fab-btn ${scanning ? 'scanning' : ''}`}
            onClick={() => scanTriggerRef.current?.()}
            disabled={scanning}
          >
            <span className={`scan-fab-icon ${scanning ? 'spin' : ''}`}>⟳</span>
            {scanning ? 'Scanning Markets…' : 'Scan Markets Now'}
          </button>
        </div>
      </div>

      {historySignal && (
        <StockDetailModal
          signal={historySignal}
          quote={null}
          isFavorite={favorites.includes(historySignal.symbol)}
          onClose={() => setHistorySignal(null)}
          onToggleFavorite={toggleFavorite}
        />
      )}
    </div>
  );
}
