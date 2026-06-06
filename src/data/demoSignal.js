export const DEMO_SIGNAL = {
  symbol: 'NVDA',
  name:   'NVIDIA Corporation',
  market: 'NASDAQ',
  confidence: 94,
  isDemo: true,
  tier: 'HIGH',
  timeframe: 'intraday',
  timeframeLabel: 'Intraday',
  timeframeHorizon: '1–4 hours',
  timeframeIcon: '⚡',
  patterns: ['Bullish Engulfing', 'Morning Star'],
  technicalSignals: [
    'RSI Oversold (28.4)',
    'MACD Bullish Crossover',
    'Price at Lower BB',
    'Volume Surge (2.1×)',
    'Short-term Trend Up',
  ],
  entryPrice: 118.45,
  stopLoss:   115.20,
  target:     126.58,
  risk:       3.25,
  reward:     8.13,
  rrRatio:    2.5,
  rsi:        28.4,
  timestamp:  Date.now(),
};

export const DEMO_QUOTE = {
  symbol:    'NVDA',
  name:      'NVIDIA Corporation',
  price:     118.45,
  change:    -1.82,
  changePct: -1.51,
  volume:    48_320_000,
  high:      121.40,
  low:       117.20,
};

// Generates a realistic demo candle set (5-min, ~6h of data)
export function generateDemoCandles() {
  const candles = [];
  const nowSec  = Math.floor(Date.now() / 1000);
  let price     = 121.8;

  for (let i = 77; i >= 1; i--) {
    const time  = nowSec - i * 300;
    const phase = i > 55 ? -0.001 : i > 20 ? 0.0002 : 0.0014; // down → flat → up
    const noise = (Math.random() - 0.5) * 0.006;
    const open  = price;
    const drift = price * (phase + noise);
    const close = open + drift;
    const wick  = price * 0.0025;
    const high  = Math.max(open, close) + Math.random() * wick;
    const low   = Math.min(open, close) - Math.random() * wick;
    const vol   = Math.floor(180_000 + Math.random() * 520_000 * (i < 10 ? 2.5 : 1));
    candles.push({
      time:  time * 1000,
      open:  +open.toFixed(2),
      high:  +high.toFixed(2),
      low:   +low.toFixed(2),
      close: +Math.max(low, Math.min(high, close)).toFixed(2),
      volume: vol,
    });
    price = close;
  }
  return candles;
}
