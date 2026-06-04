export function sma(data, period) {
  return data.map((_, i) => {
    if (i < period - 1) return null;
    return data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
  });
}

export function ema(data, period) {
  const k = 2 / (period + 1);
  const result = [];
  let prev = data[0];
  result.push(prev);
  for (let i = 1; i < data.length; i++) {
    prev = data[i] * k + prev * (1 - k);
    result.push(prev);
  }
  return result;
}

export function rsi(closes, period = 14) {
  if (closes.length < period + 1) return closes.map(() => null);
  const gains = [];
  const losses = [];
  for (let i = 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    gains.push(d > 0 ? d : 0);
    losses.push(d < 0 ? -d : 0);
  }
  const result = new Array(period).fill(null);
  let ag = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let al = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result.push(al === 0 ? 100 : 100 - 100 / (1 + ag / al));
  for (let i = period; i < gains.length; i++) {
    ag = (ag * (period - 1) + gains[i]) / period;
    al = (al * (period - 1) + losses[i]) / period;
    result.push(al === 0 ? 100 : 100 - 100 / (1 + ag / al));
  }
  return result;
}

export function macd(closes, fast = 12, slow = 26, signal = 9) {
  if (closes.length < slow) return { line: [], signal: [], hist: [] };
  const fastEma = ema(closes, fast);
  const slowEma = ema(closes, slow);
  const line = fastEma.map((f, i) => f - slowEma[i]);
  const signalLine = ema(line, signal);
  const hist = line.map((l, i) => l - signalLine[i]);
  return { line, signal: signalLine, hist };
}

export function bollingerBands(closes, period = 20, mult = 2) {
  const mid = sma(closes, period);
  const upper = [];
  const lower = [];
  for (let i = 0; i < closes.length; i++) {
    if (mid[i] === null) { upper.push(null); lower.push(null); continue; }
    const slice = closes.slice(i - period + 1, i + 1);
    const std = Math.sqrt(slice.reduce((s, v) => s + (v - mid[i]) ** 2, 0) / period);
    upper.push(mid[i] + mult * std);
    lower.push(mid[i] - mult * std);
  }
  return { upper, mid, lower };
}

export function atr(highs, lows, closes, period = 14) {
  const tr = closes.map((_, i) => {
    if (i === 0) return highs[i] - lows[i];
    return Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
  });
  const result = [null];
  let val = tr.slice(1, period + 1).reduce((a, b) => a + b, 0) / period;
  result.push(val);
  for (let i = period + 1; i < tr.length; i++) {
    val = (val * (period - 1) + tr[i]) / period;
    result.push(val);
  }
  return result;
}
