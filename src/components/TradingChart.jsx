import { useEffect, useRef } from 'react';
import { createChart, LineStyle, CrosshairMode } from 'lightweight-charts';

// Forecast steps in seconds per timeframe
const FORECAST_STEPS = {
  intraday: [900, 1800, 3600, 5400],    // 15m, 30m, 1h, 1.5h
  swing:    [86400, 172800, 345600, 518400], // 1d, 2d, 4d, 6d
  longterm: [604800, 1209600, 2419200, 3628800], // 1w, 2w, 4w, 6w
};

export function TradingChart({ candles, signal }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !candles?.length) return;

    const el = containerRef.current;
    const w  = el.clientWidth  || 600;
    const h  = el.clientHeight || 320;

    const chart = createChart(el, {
      width:  w,
      height: h,
      layout: {
        background:  { color: '#131d30' },
        textColor:   '#7f8ea3',
        fontFamily:  'system-ui, sans-serif',
        fontSize:    12,
      },
      grid: {
        vertLines: { color: '#1a2640' },
        horzLines: { color: '#1a2640' },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: '#1a2640' },
      timeScale: {
        borderColor:    '#1a2640',
        timeVisible:    true,
        secondsVisible: false,
        fixLeftEdge:    true,
      },
      handleScroll: true,
      handleScale:  true,
    });

    const ro = new ResizeObserver(() => {
      if (!el) return;
      chart.resize(el.clientWidth, el.clientHeight);
    });
    ro.observe(el);

    // Candlestick series
    const cs = chart.addCandlestickSeries({
      upColor:        '#22c55e', downColor:       '#ef4444',
      borderUpColor:  '#22c55e', borderDownColor: '#ef4444',
      wickUpColor:    '#4ade80', wickDownColor:   '#f87171',
    });

    const formatted = candles.map(c => ({
      time:  Math.floor(c.time / 1000),
      open:  c.open, high: c.high, low: c.low, close: c.close,
    }));
    cs.setData(formatted);

    // Volume series
    const vol = chart.addHistogramSeries({
      priceFormat:  { type: 'volume' },
      priceScaleId: 'vol',
    });
    chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.83, bottom: 0 } });
    vol.setData(candles.map(c => ({
      time:  Math.floor(c.time / 1000),
      value: c.volume,
      color: c.close >= c.open ? 'rgba(34,197,94,0.18)' : 'rgba(239,68,68,0.18)',
    })));

    // Signal price lines + forecast
    if (signal && signal.entryPrice > 0) {
      cs.createPriceLine({ price: signal.entryPrice, color: '#3b82f6', lineWidth: 2, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: 'Entry' });
      cs.createPriceLine({ price: signal.stopLoss,   color: '#ef4444', lineWidth: 2, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: 'Stop'  });
      cs.createPriceLine({ price: signal.target,     color: '#22c55e', lineWidth: 2, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: 'Target' });

      const lastTime = formatted[formatted.length - 1].time;
      const last     = formatted[formatted.length - 1].close;
      const diff     = signal.target - last;

      // Forecast line — offsets scale with timeframe
      const steps = FORECAST_STEPS[signal.timeframe] ?? FORECAST_STEPS.intraday;
      const [T1, T2, T3, T4] = steps.map(s => lastTime + s);
      const fcast = chart.addLineSeries({
        color: '#f59e0b', lineWidth: 2, lineStyle: LineStyle.SparseDotted,
        lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false,
      });
      fcast.setData([
        { time: lastTime, value: last },
        { time: T1, value: last + diff * 0.2  },
        { time: T2, value: last + diff * 0.45 },
        { time: T3, value: last + diff * 0.75 },
        { time: T4, value: last + diff * 0.95 },
      ]);

      // Confidence envelope
      const spread = signal.risk * 0.4;
      [[last + spread * 0.2, last + diff * 0.95 + spread],
       [last - spread * 0.2, last + diff * 0.95 - spread]].forEach(([s, e]) => {
        const env = chart.addLineSeries({
          color: 'rgba(245,158,11,0.25)', lineWidth: 1, lineStyle: LineStyle.Dotted,
          lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false,
        });
        env.setData([{ time: lastTime, value: s }, { time: T4, value: e }]);
      });
    }

    chart.timeScale().fitContent();
    return () => { ro.disconnect(); chart.remove(); };
  }, [candles, signal]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {signal && signal.entryPrice > 0 && (
        <div className="chart-legend">
          <span className="cl-item blue">— Entry</span>
          <span className="cl-item red">— Stop</span>
          <span className="cl-item green">— Target</span>
          <span className="cl-item amber">⋯ Forecast</span>
        </div>
      )}
    </div>
  );
}
