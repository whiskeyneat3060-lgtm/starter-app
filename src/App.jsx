import { useState, useRef, useCallback } from 'react';
import { Header }           from './components/Header.jsx';
import { Sidebar }          from './components/Sidebar.jsx';
import { BottomNav }        from './components/BottomNav.jsx';
import { StockScanner }     from './components/StockScanner.jsx';
import { StockSearch }      from './components/StockSearch.jsx';
import { FavoritesPanel }   from './components/FavoritesPanel.jsx';
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

function makeMinimalSignal(symbol, name = '') {
  return {
    symbol, name: name || symbol,
    market: 'SEARCH', confidence: 0, tier: 'STRONG',
    patterns: [], technicalSignals: [],
    entryPrice: 0, stopLoss: 0, target: 0,
    risk: 0, reward: 0, rrRatio: 0, rsi: null,
    timeframe: 'intraday', timeframeLabel: 'Intraday',
    timestamp: Date.now(), isSearchResult: true,
  };
}

export default function App() {
  const [view,           setView]          = useState('scanner');
  const [sidebarOpen,    setSidebarOpen]   = useState(window.innerWidth >= 1024);
  const [searchOpen,     setSearchOpen]    = useState(false);
  const [activeMarkets,  setActiveMarkets] = useState(['NASDAQ']);
  const [confidenceMin,  setConfidenceMin] = useState(90);
  const [timeframe,      setTimeframe]     = useState('intraday');
  const [maxPrice,       setMaxPrice]      = useState(Infinity);
  const [favorites,      setFavorites]     = useLocalStorage('ats-favorites', []);
  const [signalHistory,  setSignalHistory] = useSessionStorage('ats-history', []);
  const [scanning,       setScanning]      = useState(false);
  const [lastScan,       setLastScan]      = useState(null);
  const [signalCount,    setSignalCount]   = useState(0);
  const [stocksScanned,  setStocksScanned] = useState(0);
  const [modalSignal,    setModalSignal]   = useState(null);
  const [modalQuote,     setModalQuote]    = useState(null);

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

  const openModal = useCallback((signal, quote = null) => {
    setModalSignal(signal);
    setModalQuote(quote);
  }, []);

  const closeModal = useCallback(() => {
    setModalSignal(null);
    setModalQuote(null);
  }, []);

  const handleSearchSelect = useCallback((stock) => {
    const sig = makeMinimalSignal(stock.symbol, stock.name);
    openModal(sig, null);
    setSearchOpen(false);
  }, [openModal]);

  const handleFavoriteOpen = useCallback((sym, sig) => {
    if (sig) { openModal(sig); return; }
    const hist = signalHistory.find(s => s.symbol === sym);
    openModal(hist ?? makeMinimalSignal(sym));
  }, [signalHistory, openModal]);

  const handleViewChange = useCallback((v) => {
    if (v === 'search') { setSearchOpen(true); return; }
    setView(v);
    if (window.innerWidth < 1024) setSidebarOpen(false);
  }, []);

  return (
    <div className={`app-root ${sidebarOpen ? 'sb-open' : 'sb-closed'}`}>
      {/* Desktop sidebar */}
      <Sidebar
        view={view}
        onViewChange={handleViewChange}
        favorites={favorites}
        signalHistory={signalHistory}
        onFavoriteOpen={handleFavoriteOpen}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(p => !p)}
      />

      <div className="app-main">
        <Header
          scanning={scanning}
          lastScan={lastScan}
          signalCount={signalCount}
          stocksScanned={stocksScanned}
          onMenuToggle={() => setSidebarOpen(p => !p)}
          onSearchOpen={() => setSearchOpen(true)}
        />

        <div className="app-content">
          {(view === 'scanner' || view === 'history') && (
            <StockScanner
              activeMarkets={activeMarkets}   onMarketsChange={setActiveMarkets}
              confidenceMin={confidenceMin}   onConfidenceChange={setConfidenceMin}
              timeframe={timeframe}           onTimeframeChange={setTimeframe}
              maxPrice={maxPrice}             onMaxPriceChange={setMaxPrice}
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

          {view === 'favorites' && (
            <FavoritesPanel
              favorites={favorites}
              onRemoveFavorite={toggleFavorite}
            />
          )}
        </div>

        {/* Floating scan button */}
        <div className="scan-fab-wrap">
          <button
            className={`scan-fab-btn ${scanning ? 'scanning' : ''}`}
            onClick={() => scanTriggerRef.current?.()}
            disabled={scanning}
          >
            <span className={`scan-fab-icon ${scanning ? 'spin' : ''}`}>⟳</span>
            {scanning ? 'Scanning…' : 'Scan Now'}
          </button>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <BottomNav
        view={view}
        onChange={handleViewChange}
        favCount={favorites.length}
        histCount={signalHistory.length}
      />

      {/* Search overlay */}
      {searchOpen && (
        <StockSearch
          onClose={() => setSearchOpen(false)}
          onSelectStock={handleSearchSelect}
        />
      )}

      {/* Detail modal */}
      {modalSignal && (
        <StockDetailModal
          signal={modalSignal}
          quote={modalQuote}
          isFavorite={favorites.includes(modalSignal.symbol)}
          timeframe={timeframe}
          onClose={closeModal}
          onToggleFavorite={toggleFavorite}
        />
      )}
    </div>
  );
}
