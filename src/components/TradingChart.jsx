import { useEffect, useRef } from 'react';
import { createChart, LineStyle, CrosshairMode } from 'lightweight-charts';

export function TradingChart({ candles, signal }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !candles?.length) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: '#0d1117' },
        textColor:  '#9ca3af',
        fontFamily: 'system-ui, sans-serif',
        fontSize:   12,
      },
      grid: {
        vertLines: { color: '#161b22' },
        horzLines: { color: '#161b22' },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: '#30363d' },
      timeScale: {
        borderColor: '#30363d',
        timeVisible: true,
        secondsVisible: false,
        fixLeftEdge: true,
      },
      handleScroll: true,
      handleScale:  true,
    });

    // Resize observer
    const ro = new ResizeObserver(() => {
      chart.resize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    });
    ro.observe(containerRef.current);

    // Candles
    const candleSeries = chart.addCandlestickSeries({
      upColor:         '#10b981',
      downColor:       '#ef4444',
      borderUpColor:   '#10b981',
      borderDownColor: '#ef4444',
      wickUpColor:     '#34d399',
      wickDownColor:   '#f87171',
    });

    const formatted = candles.map(c => ({
      time:  Math.floor(c.time / 1000),
      open:  c.open,
      high:  c.high,
      low:   c.low,
      close: c.close,
    }));
    candleSeries.setData(formatted);

    // Volume histogram
    const volSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
      color: '#1f2937',
    });
    chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    volSeries.setData(candles.map(c => ({
      time:  Math.floor(c.time / 1000),
      value: c.volume,
      color: c.close >= c.open ? '#10b98133' : '#ef444433',
    })));

    const lastTime = formatted[formatted.length - 1].time;

    // Signal overlays
    if (signal) {
      // Entry level
      candleSeries.createPriceLine({
        price:            signal.entryPrice,
        color:            '#3b82f6',
        lineWidth:        2,
        lineStyle:        LineStyle.Dashed,
        axisLabelVisible: true,
        title:            'Entry',
      });

      // Stop loss
      candleSeries.createPriceLine({
        price:            signal.stopLoss,
        color:            '#ef4444',
        lineWidth:        2,
        lineStyle:        LineStyle.Dashed,
        axisLabelVisible: true,
        title:            'Stop Loss',
      });

      // Target
      candleSeries.createPriceLine({
        price:            signal.target,
        color:            '#10b981',
        lineWidth:        2,
        lineStyle:        LineStyle.Dashed,
        axisLabelVisible: true,
        title:            'Target',
      });

      // Forecast projection path (amber, dashed)
      const fcast = chart.addLineSeries({
        color:              '#f59e0b',
        lineWidth:          2,
        lineStyle:          LineStyle.SparseDotted,
        lastValueVisible:   false,
        priceLineVisible:   false,
        crosshairMarkerVisible: false,
      });

      const last  = formatted[formatted.length - 1].close;
      const diff  = signal.target - last;
      const T15   = lastTime + 15 * 60;
      const T30   = lastTime + 30 * 60;
      const T60   = lastTime + 60 * 60;
      const T90   = lastTime + 90 * 60;
      fcast.setData([
        { time: lastTime, value: last },
        { time: T15, value: last + diff * 0.2 },
        { time: T30, value: last + diff * 0.45 },
        { time: T60, value: last + diff * 0.75 },
        { time: T90, value: last + diff * 0.95 },
      ]);

      // Confidence band (upper / lower envelopes)
      const spread = signal.risk * 0.5;
      const upper = chart.addLineSeries({
        color: '#f59e0b22', lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false,
      });
      upper.setData([
        { time: lastTime, value: last + spread * 0.3 },
        { time: T90, value: last + diff * 0.95 + spread },
      ]);
      const lower_ = chart.addLineSeries({
        color: '#f59e0b22', lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false,
      });
      lower_.setData([
        { time: lastTime, value: last - spread * 0.3 },
        { time: T90, value: last + diff * 0.95 - spread },
      ]);
    }

    chart.timeScale().fitContent();

    return () => {
      ro.disconnect();
      chart.remove();
    };
  }, [candles, signal]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {signal && (
        <div className="chart-legend">
          <span className="legend-item blue">— Entry {signal.entryPrice.toFixed(2)}</span>
          <span className="legend-item red">— Stop {signal.stopLoss.toFixed(2)}</span>
          <span className="legend-item green">— Target {signal.target.toFixed(2)}</span>
          <span className="legend-item amber">⋯ Forecast</span>
        </div>
      )}
    </div>
  );
}
