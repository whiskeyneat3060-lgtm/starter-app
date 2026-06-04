const PROXY = 'https://corsproxy.io/?';

async function get(url) {
  const res = await fetch(`${PROXY}${url}`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchBatchQuotes(symbols) {
  const chunks = [];
  for (let i = 0; i < symbols.length; i += 8) chunks.push(symbols.slice(i, i + 8));

  const out = {};
  for (const chunk of chunks) {
    try {
      const data = await get(
        `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${chunk.join(',')}`
      );
      const results = data?.quoteResponse?.result ?? [];
      for (const q of results) {
        if (q.regularMarketPrice == null) continue;
        out[q.symbol] = {
          symbol:       q.symbol,
          name:         q.longName || q.shortName || q.symbol,
          price:        q.regularMarketPrice,
          change:       q.regularMarketChange ?? 0,
          changePct:    q.regularMarketChangePercent ?? 0,
          volume:       q.regularMarketVolume ?? 0,
          high:         q.regularMarketDayHigh,
          low:          q.regularMarketDayLow,
          open:         q.regularMarketOpen,
          prevClose:    q.regularMarketPreviousClose,
        };
      }
    } catch {
      // skip failed chunk
    }
    await new Promise(r => setTimeout(r, 250));
  }
  return out;
}

export async function fetchCandles(symbol) {
  const data = await get(
    `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=5m&range=1d`
  );
  const chart = data?.chart?.result?.[0];
  if (!chart?.timestamp) return [];

  const ts   = chart.timestamp;
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

export async function fetchCompanyInfo(symbol) {
  const data = await get(
    `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=assetProfile,summaryDetail,financialData`
  );
  const r = data?.quoteSummary?.result?.[0] ?? {};
  const p = r.assetProfile ?? {};
  const s = r.summaryDetail ?? {};
  const f = r.financialData ?? {};
  return {
    description: p.longBusinessSummary ?? null,
    sector:      p.sector ?? null,
    industry:    p.industry ?? null,
    employees:   p.fullTimeEmployees ?? null,
    website:     p.website ?? null,
    country:     p.country ?? null,
    pe:          s.trailingPE?.raw ?? null,
    marketCap:   s.marketCap?.raw ?? null,
    targetPrice: f.targetMeanPrice?.raw ?? null,
    recommendation: f.recommendationKey ?? null,
  };
}

export async function fetchNews(symbol) {
  const data = await get(
    `https://query1.finance.yahoo.com/v1/finance/search?q=${symbol}&newsCount=10&quotesCount=0`
  );
  return (data?.news ?? []).map(n => ({
    title:     n.title,
    link:      n.link,
    publisher: n.publisher,
    time:      n.providerPublishTime * 1000,
  }));
}
