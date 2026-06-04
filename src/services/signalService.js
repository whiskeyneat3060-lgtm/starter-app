import { rsi, macd, bollingerBands, atr, sma } from '../utils/technicalIndicators.js';
import { detectPatterns } from './patternService.js';

// Scoring bands — total max = 100
// Pattern    0-35
// RSI        0-25
// MACD       0-20
// Volume     0-15
// Trend      0-5

function scoreIndicators(candles) {
  const closes  = candles.map(c => c.close);
  const highs   = candles.map(c => c.high);
  const lows    = candles.map(c => c.low);
  const volumes = candles.map(c => c.volume);

  let score = 0;
  const signals = [];

  // RSI
  const rsiVals = rsi(closes, 14);
  const curRSI  = rsiVals[rsiVals.length - 1];
  if (curRSI !== null) {
    if (curRSI < 25)      { score += 25; signals.push(`RSI Deeply Oversold (${curRSI.toFixed(1)})`); }
    else if (curRSI < 32) { score += 20; signals.push(`RSI Oversold (${curRSI.toFixed(1)})`); }
    else if (curRSI < 40) { score += 12; signals.push(`RSI Low (${curRSI.toFixed(1)})`); }
    else if (curRSI < 50) { score += 5; }
  }

  // MACD
  if (closes.length >= 35) {
    const { hist } = macd(closes);
    const n = hist.length;
    const h0 = hist[n - 1], h1 = hist[n - 2];
    if (h0 !== undefined && h1 !== undefined) {
      if (h0 > 0 && h1 <= 0)          { score += 20; signals.push('MACD Bullish Crossover'); }
      else if (h0 > h1 && h0 > 0)     { score += 13; signals.push('MACD Bullish Momentum'); }
      else if (h0 > h1)               { score += 6; }
    }
  }

  // Bollinger Bands
  if (closes.length >= 20) {
    const { lower } = bollingerBands(closes);
    const n = closes.length - 1;
    if (lower[n] !== null) {
      if (closes[n] <= lower[n])           { score += 15; signals.push('Price at Lower BB'); }
      else if (closes[n] <= lower[n] * 1.005) { score += 8; signals.push('Near Lower BB'); }
    }
  }

  // Volume confirmation
  if (volumes.length >= 20) {
    const volSma = sma(volumes, 20);
    const n = volumes.length - 1;
    const avg = volSma[n];
    if (avg && volumes[n] > avg * 1.8)  { score += 15; signals.push('Surge in Volume (1.8×)'); }
    else if (avg && volumes[n] > avg * 1.3) { score += 8; signals.push('Above-Avg Volume'); }
  }

  // Short-term trend
  if (closes.length >= 10) {
    const ema5  = closes.slice(-5);
    const ema10 = closes.slice(-10);
    const avg5  = ema5.reduce((a, b) => a + b, 0) / 5;
    const avg10 = ema10.reduce((a, b) => a + b, 0) / 10;
    if (avg5 > avg10) { score += 5; signals.push('Short-term Trend Up'); }
  }

  return { score, signals, curRSI };
}

function stopLoss(candles) {
  const highs  = candles.map(c => c.high);
  const lows   = candles.map(c => c.low);
  const closes = candles.map(c => c.close);
  const atrVals = atr(highs, lows, closes, 14);
  const curATR  = atrVals[atrVals.length - 1];
  const price   = closes[closes.length - 1];
  return curATR ? price - curATR * 1.5 : price * 0.97;
}

function target(entry, stop, patternStrength) {
  const risk = entry - stop;
  let rr = 2.0;
  if (patternStrength >= 85) rr = 3.0;
  else if (patternStrength >= 70) rr = 2.5;
  return entry + risk * rr;
}

export function generateSignal(symbol, candles) {
  if (candles.length < 35) return null;

  const patterns = detectPatterns(candles);
  if (patterns.length === 0) return null;

  const best = patterns.sort((a, b) => b.strength - a.strength)[0];
  const patternScore = (best.strength / 100) * 35;

  const { score: indicatorScore, signals, curRSI } = scoreIndicators(candles);

  const confidence = Math.min(Math.round(patternScore + indicatorScore), 99);
  if (confidence < 90) return null;

  const price  = candles[candles.length - 1].close;
  const stop   = stopLoss(candles);
  const tgt    = target(price, stop, best.strength);
  const risk   = price - stop;
  const reward = tgt - price;

  return {
    symbol,
    confidence,
    patterns: patterns.map(p => p.name),
    technicalSignals: signals,
    entryPrice: price,
    stopLoss: stop,
    target: tgt,
    risk,
    reward,
    rrRatio: reward / risk,
    rsi: curRSI,
    timestamp: Date.now(),
  };
}
