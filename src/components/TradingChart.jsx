import { useEffect, useRef } from 'react';
import { createChart, LineStyle, CrosshairMode } from 'lightweight-charts';

export function TradingChart({ candles, signal }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !candles?.length) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: '#ffffff' },
        textColor:  '#475569',
        fontFamily: 'system-ui, sans-serif',
        fontSize:   12,
      },
      grid: {
        vertLines: { color: '#f1f5f9' },
        horzLines: { color: '#f1f5f9' },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: '#e2e8f0' },
      timeScale: {
        borderColor: '#e2e8f0',
        timeVisible: true,
        secondsVisible: false,
        fixLeftEdge: true,
      },
      handleScroll: true,
      handleScale:  true,
    });

    const ro = new ResizeObserver(() => {
      chart.resize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    });
    ro.observe(containerRef.current);

    // Candles
    const cs = chart.addCandlestickSeries({
      upColor: '#059669', downColor: '#dc2626',
      borderUpColor: '#059669', borderDownColor: '#dc2626',
      wickUpColor: '#34d399', wickDownColor: '#f87171',
    });
    const formatted = candles.map(c => ({
      time: Math.floor(c.time / 1000),
      open: c.open, high: c.high, low: c.low, close: c.close,
    }));
    cs.setData(formatted);

    // Volume bars
    const vol = chart.addHistogramSeries({
      priceFormat: { type: 'volume' }, priceScaleId: 'vol',
    });
    chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    vol.setData(candles.map(c => ({
      time:  Math.floor(c.time / 1000),
      value: c.volume,
      color: c.close >= c.open ? '#05966922' : '#dc262622',
    })));

    const lastTime = formatted[formatted.length - 1].time;

    if (signal) {
      cs.createPriceLine({ price: signal.entryPrice, color: '#2563eb', lineWidth: 2, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: 'Entry' });
      cs.createPriceLine({ price: signal.stopLoss,   color: '#dc2626', lineWidth: 2, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: 'Stop' });
      cs.createPriceLine({ price: signal.target,     color: '#059669', lineWidth: 2, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: 'Target' });

      const fcast = chart.addLineSeries({
        color: '#d97706', lineWidth: 2, lineStyle: LineStyle.SparseDotted,
        lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false,
      });
      const last = formatted[formatted.length - 1].close;
      const diff = signal.target - last;
      const T15 = lastTime + 900, T30 = lastTime + 1800, T60 = lastTime + 3600, T90 = lastTime + 5400;
      fcast.setData([
        { time: lastTime, value: last },
        { time: T15, value: last + diff * 0.2 },
        { time: T30, value: last + diff * 0.45 },
        { time: T60, value: last + diff * 0.75 },
        { time: T90, value: last + diff * 0.95 },
      ]);

      // Confidence envelope
      const spread = signal.risk * 0.4;
      [[last + spread*.2, last + diff*.95 + spread], [last - spread*.2, last + diff*.95 - spread]].forEach(([s, e]) => {
        const env = chart.addLineSeries({ color: '#d9780633', lineWidth: 1, lineStyle: LineStyle.Dotted, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false });
        env.setData([{ time: lastTime, value: s }, { time: T90, value: e }]);
      });
    }

    chart.timeScale().fitContent();
    return () => { ro.disconnect(); chart.remove(); };
  }, [candles, signal]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {signal && (
        <div className="chart-legend-light">
          <span className="cl-item blue">— Entry</span>
          <span className="cl-item red">— Stop</span>
          <span className="cl-item green">— Target</span>
          <span className="cl-item amber">⋯ Forecast</span>
        </div>
      )}
    </div>
  );
}
