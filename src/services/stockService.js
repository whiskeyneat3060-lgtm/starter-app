// ─── CORS Proxy chain ───────────────────────────────────────────────────────
const PROXIES = [
  url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

async function fetchJSON(rawUrl) {
  for (const proxy of PROXIES) {
    try {
      const res = await fetch(proxy(rawUrl), { signal: AbortSignal.timeout(10000) });
      if (!res.ok) continue;
      return await res.json();
    } catch { /* try next */ }
  }
  throw new Error(`All proxies failed for: ${rawUrl}`);
}

// ─── Batch quotes ────────────────────────────────────────────────────────────
export async function fetchBatchQuotes(symbols) {
  const chunks = [];
  for (let i = 0; i < symbols.length; i += 8) chunks.push(symbols.slice(i, i + 8));
  const out = {};
  for (const chunk of chunks) {
    try {
      const data = await fetchJSON(
        `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${chunk.join(',')}`
      );
      for (const q of data?.quoteResponse?.result ?? []) {
        if (q.regularMarketPrice == null) continue;
        out[q.symbol] = {
          symbol:    q.symbol,
          name:      q.longName || q.shortName || q.symbol,
          price:     q.regularMarketPrice,
          change:    q.regularMarketChange ?? 0,
          changePct: q.regularMarketChangePercent ?? 0,
          volume:    q.regularMarketVolume ?? 0,
          high:      q.regularMarketDayHigh,
          low:       q.regularMarketDayLow,
          open:      q.regularMarketOpen,
          prevClose: q.regularMarketPreviousClose,
          mktCap:    q.marketCap,
          exchange:  q.fullExchangeName,
        };
      }
    } catch { /* skip */ }
    await new Promise(r => setTimeout(r, 200));
  }
  return out;
}

// ─── Candles (supports intraday / swing / longterm) ──────────────────────────
const INTERVALS = {
  intraday: { interval: '5m',  range: '1d'  },
  swing:    { interval: '1d',  range: '3mo' },
  longterm: { interval: '1wk', range: '2y'  },
};

export async function fetchCandles(symbol, timeframe = 'intraday') {
  const { interval, range } = INTERVALS[timeframe] ?? INTERVALS.intraday;
  const data = await fetchJSON(
    `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`
  );
  const chart = data?.chart?.result?.[0];
  if (!chart?.timestamp) return [];
  const ts    = chart.timestamp;
  const ohlcv = chart.indicators?.quote?.[0] ?? {};
  return ts
    .map((t, i) => ({
      time:   t * 1000,
      open:   ohlcv.open?.[i],
      high:   ohlcv.high?.[i],
      low:    ohlcv.low?.[i],
      close:  ohlcv.close?.[i],
      volume: ohlcv.volume?.[i] ?? 0,
    }))
    .filter(c => c.open != null && c.high != null && c.low != null && c.close != null);
}

// ─── Single quote ─────────────────────────────────────────────────────────────
export async function fetchQuote(symbol) {
  const data = await fetchBatchQuotes([symbol]);
  return data[symbol] ?? null;
}

// ─── Company info ─────────────────────────────────────────────────────────────
export async function fetchCompanyInfo(symbol) {
  const data = await fetchJSON(
    `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=assetProfile,summaryDetail,financialData`
  );
  const r = data?.quoteSummary?.result?.[0] ?? {};
  const p = r.assetProfile ?? {};
  const s = r.summaryDetail ?? {};
  const f = r.financialData ?? {};
  return {
    description:    p.longBusinessSummary ?? null,
    sector:         p.sector ?? null,
    industry:       p.industry ?? null,
    employees:      p.fullTimeEmployees ?? null,
    website:        p.website ?? null,
    country:        p.country ?? null,
    pe:             s.trailingPE?.raw ?? null,
    marketCap:      s.marketCap?.raw ?? null,
    targetPrice:    f.targetMeanPrice?.raw ?? null,
    recommendation: f.recommendationKey ?? null,
  };
}

// ─── News ─────────────────────────────────────────────────────────────────────
export async function fetchNews(symbol) {
  const data = await fetchJSON(
    `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&newsCount=10&quotesCount=0`
  );
  return (data?.news ?? []).map(n => ({
    title:     n.title,
    link:      n.link,
    publisher: n.publisher,
    time:      (n.providerPublishTime ?? 0) * 1000,
  }));
}

// ─── Stock search (autocomplete) ─────────────────────────────────────────────
export async function searchStocks(query) {
  if (!query || query.length < 1) return [];
  const data = await fetchJSON(
    `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0&enableFuzzyQuery=true`
  );
  return (data?.quotes ?? [])
    .filter(q => q.quoteType === 'EQUITY' || q.quoteType === 'ETF')
    .map(q => ({
      symbol:   q.symbol,
      name:     q.shortname || q.longname || q.symbol,
      exchange: q.exchDisp || q.exchange || '',
      type:     q.quoteType,
    }));
}
