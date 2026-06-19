import { rsi, macd, bollingerBands, atr, sma } from '../utils/technicalIndicators.js';
import { detectPatterns } from './patternService.js';
import { confidenceTier } from '../utils/formatters.js';

function scoreIndicators(candles) {
  const closes  = candles.map(c => c.close);
  const volumes = candles.map(c => c.volume);
  let score = 0;
  const signals = [];

  const rsiVals = rsi(closes, 14);
  const curRSI  = rsiVals[rsiVals.length - 1];
  if (curRSI !== null) {
    if (curRSI < 25)      { score += 25; signals.push(`RSI Deeply Oversold (${curRSI.toFixed(1)})`); }
    else if (curRSI < 32) { score += 20; signals.push(`RSI Oversold (${curRSI.toFixed(1)})`); }
    else if (curRSI < 40) { score += 12; signals.push(`RSI Low (${curRSI.toFixed(1)})`); }
    else if (curRSI < 50) { score += 5; }
  }

  if (closes.length >= 35) {
    const { hist } = macd(closes);
    const n = hist.length;
    const h0 = hist[n - 1], h1 = hist[n - 2];
    if (h0 !== undefined && h1 !== undefined) {
      if (h0 > 0 && h1 <= 0)      { score += 20; signals.push('MACD Bullish Crossover'); }
      else if (h0 > h1 && h0 > 0) { score += 13; signals.push('MACD Bullish Momentum'); }
      else if (h0 > h1)            { score += 6; }
    }
  }

  if (closes.length >= 20) {
    const { lower } = bollingerBands(closes);
    const n = closes.length - 1;
    if (lower[n] !== null) {
      if (closes[n] <= lower[n])            { score += 15; signals.push('Price at Lower BB'); }
      else if (closes[n] <= lower[n]*1.005) { score += 8;  signals.push('Near Lower BB'); }
    }
  }

  if (volumes.length >= 20) {
    const vs  = sma(volumes, 20);
    const n   = volumes.length - 1;
    const avg = vs[n];
    if (avg && volumes[n] > avg * 1.8)   { score += 15; signals.push(`Volume Surge (${(volumes[n]/avg).toFixed(1)}×)`); }
    else if (avg && volumes[n] > avg*1.3){ score += 8;  signals.push('Above-Avg Volume'); }
  }

  if (closes.length >= 10) {
    const a5  = closes.slice(-5).reduce((a,b)=>a+b,0)/5;
    const a10 = closes.slice(-10).reduce((a,b)=>a+b,0)/10;
    if (a5 > a10) { score += 5; signals.push('Short-term Trend Up'); }
  }

  // Long-term: near 52-week (or 1-year weekly) low — high-value entry zone
  if (closes.length >= 50) {
    const yearLow  = Math.min(...closes.slice(-52));
    const yearHigh = Math.max(...closes.slice(-52));
    const cur = closes[closes.length - 1];
    const pctFromLow = (cur - yearLow) / (yearHigh - yearLow);
    if (pctFromLow <= 0.10)      { score += 20; signals.push('Near 52-Week Low'); }
    else if (pctFromLow <= 0.20) { score += 12; signals.push('In Lower 20% of 52W Range'); }
    else if (pctFromLow <= 0.35) { score += 5; }
  }

  // Long-term: price below 200-period SMA (oversold on macro scale)
  if (closes.length >= 200) {
    const sma200 = sma(closes, 200);
    const n = closes.length - 1;
    if (sma200[n] && closes[n] < sma200[n] * 0.90) { score += 10; signals.push('15%+ Below 200 SMA'); }
    else if (sma200[n] && closes[n] < sma200[n])   { score += 6;  signals.push('Below 200 SMA'); }
  }

  return { score, signals, curRSI };
}

function calcStop(candles) {
  const highs  = candles.map(c => c.high);
  const lows   = candles.map(c => c.low);
  const closes = candles.map(c => c.close);
  const atrV   = atr(highs, lows, closes, 14);
  const curATR = atrV[atrV.length - 1];
  const price  = closes[closes.length - 1];
  return curATR ? price - curATR * 1.5 : price * 0.97;
}

function calcTarget(entry, stop, strength) {
  const risk = entry - stop;
  return entry + risk * (strength >= 85 ? 3.0 : strength >= 70 ? 2.5 : 2.0);
}

const TIMEFRAME_LABELS = {
  intraday: { label: 'Intraday', horizon: '1–4 hours', icon: '⚡' },
  swing:    { label: 'Swing',    horizon: '1–2 weeks', icon: '📈' },
  longterm: { label: 'Long-term',horizon: '1–3 months', icon: '📊' },
};

// Timeframe-aware minimum candle counts
const MIN_CANDLES = { intraday: 35, swing: 35, longterm: 20 };

export function generateSignal(symbol, candles, market = 'NASDAQ', minConfidence = 80, timeframe = 'intraday') {
  const minRequired = MIN_CANDLES[timeframe] ?? 35;
  if (candles.length < minRequired) return null;

  const patterns    = detectPatterns(candles);
  // Patterns are a bonus, not a hard gate — many valid setups lack a textbook pattern
  const best        = patterns.sort((a, b) => b.strength - a.strength)[0];
  const patternScore = best ? (best.strength / 100) * 30 : 0;

  const { score: indScore, signals, curRSI } = scoreIndicators(candles);

  // Base score from indicators only; pattern adds up to 30 pts on top
  const rawScore   = indScore + patternScore;
  const confidence = Math.min(Math.round(rawScore), 99);
  if (confidence < minConfidence) return null;

  // Need at least some indicator confirmation even without a pattern
  if (indScore < 15) return null;

  const price  = candles[candles.length - 1].close;
  const stop   = calcStop(candles);
  const tgt    = calcTarget(price, stop, best?.strength ?? 65);
  const risk   = price - stop;
  const reward = tgt - price;
  const tier   = confidenceTier(confidence);
  const tf     = TIMEFRAME_LABELS[timeframe] ?? TIMEFRAME_LABELS.intraday;

  return {
    symbol, market, confidence,
    tier:      tier.label,
    timeframe, timeframeLabel: tf.label, timeframeHorizon: tf.horizon, timeframeIcon: tf.icon,
    patterns:         patterns.map(p => p.name),
    technicalSignals: signals,
    entryPrice: price,
    stopLoss:   stop,
    target:     tgt,
    risk, reward,
    rrRatio: reward / risk,
    rsi:     curRSI,
    timestamp: Date.now(),
  };
}
