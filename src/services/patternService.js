// Candlestick pattern recognition for bullish reversal / continuation patterns

const body = (o, c) => Math.abs(c - o);
const range = (h, l) => h - l;
const upperWick = (o, h, c) => h - Math.max(o, c);
const lowerWick = (o, l, c) => Math.min(o, c) - l;

function hammer(o, h, l, c) {
  const b = body(o, c);
  const r = range(h, l);
  if (r === 0) return false;
  return lowerWick(o, l, c) >= 2 * b && upperWick(o, h, c) <= 0.15 * r && b <= 0.4 * r;
}

function invertedHammer(o, h, l, c) {
  const b = body(o, c);
  const r = range(h, l);
  if (r === 0) return false;
  return upperWick(o, h, c) >= 2 * b && lowerWick(o, l, c) <= 0.15 * r && b <= 0.4 * r;
}

function doji(o, h, l, c) {
  const r = range(h, l);
  return r > 0 && body(o, c) <= r * 0.08;
}

function bullishEngulfing(p, c) {
  return p.c < p.o && c.c > c.o && c.o <= p.c && c.c >= p.o;
}

function piercingLine(p, c) {
  const mid = (p.o + p.c) / 2;
  return p.c < p.o && c.c > c.o && c.o < p.c && c.c > mid && c.c < p.o;
}

function bullishHarami(p, c) {
  if (!(p.c < p.o && c.c > c.o)) return false;
  return c.o > p.c && c.c < p.o && body(c.o, c.c) < body(p.o, p.c) * 0.5;
}

function tweezerBottom(p, c) {
  return p.c < p.o && c.c > c.o && Math.abs(p.l - c.l) / p.l < 0.001;
}

function morningStar(a, b_, c) {
  const aBody = body(a.o, a.c);
  const bBody = body(b_.o, b_.c);
  const cBody = body(c.o, c.c);
  return (
    a.c < a.o && aBody > bBody * 3 &&
    c.c > c.o && cBody > aBody * 0.5 &&
    c.c > (a.o + a.c) / 2
  );
}

function threeWhiteSoldiers(a, b_, c) {
  return (
    a.c > a.o && b_.c > b_.o && c.c > c.o &&
    b_.o > a.o && b_.c > a.c &&
    c.o > b_.o && c.c > b_.c &&
    b_.o < a.c && c.o < b_.c // opens within previous body
  );
}

export function detectPatterns(candles) {
  if (candles.length < 3) return [];
  const n = candles.length;
  const [c3, c2, c1] = [candles[n - 3], candles[n - 2], candles[n - 1]];
  const results = [];

  // Single-candle
  if (hammer(c1.open, c1.high, c1.low, c1.close))
    results.push({ name: 'Hammer', strength: 72 });
  if (invertedHammer(c1.open, c1.high, c1.low, c1.close))
    results.push({ name: 'Inverted Hammer', strength: 62 });
  if (doji(c1.open, c1.high, c1.low, c1.close))
    results.push({ name: 'Doji Reversal', strength: 58 });

  // Two-candle
  const p2 = { o: c2.open, h: c2.high, l: c2.low, c: c2.close };
  const p1 = { o: c1.open, h: c1.high, l: c1.low, c: c1.close };
  if (bullishEngulfing(p2, p1)) results.push({ name: 'Bullish Engulfing', strength: 86 });
  if (piercingLine(p2, p1))     results.push({ name: 'Piercing Line',    strength: 70 });
  if (bullishHarami(p2, p1))    results.push({ name: 'Bullish Harami',   strength: 64 });
  if (tweezerBottom(p2, p1))    results.push({ name: 'Tweezer Bottom',   strength: 68 });

  // Three-candle
  const p3 = { o: c3.open, h: c3.high, l: c3.low, c: c3.close };
  if (morningStar(p3, p2, p1))        results.push({ name: 'Morning Star',          strength: 90 });
  if (threeWhiteSoldiers(p3, p2, p1)) results.push({ name: 'Three White Soldiers',  strength: 88 });

  return results;
}
