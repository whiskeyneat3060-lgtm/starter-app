import { useState, useCallback } from 'react';
import { Header }       from './components/Header.jsx';
import { StockScanner } from './components/StockScanner.jsx';
import './App.css';

// Scanner exposes scan control via an event bus pattern
let triggerScan = null;
export const registerScanTrigger = (fn) => { triggerScan = fn; };

function App() {
  const [scanning,    setScanning]    = useState(false);
  const [lastScan,    setLastScan]    = useState(null);
  const [signalCount, setSignalCount] = useState(0);

  const handleScanRequest = useCallback(() => {
    if (triggerScan) triggerScan();
  }, []);

  return (
    <div className="app-root">
      <Header
        signalCount={signalCount}
        lastScan={lastScan}
        scanning={scanning}
        onScan={handleScanRequest}
      />
      <StockScanner
        onScanStart={() => setScanning(true)}
        onScanEnd={(sigs, time) => {
          setScanning(false);
          setLastScan(time);
          setSignalCount(sigs);
        }}
        registerTrigger={registerScanTrigger}
      />
    </div>
  );
}

export default App;
