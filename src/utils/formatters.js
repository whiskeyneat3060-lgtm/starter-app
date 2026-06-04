export const fmtPrice = (n) =>
  n == null ? '—' : `$${Number(n).toFixed(2)}`;

export const fmtPct = (n) =>
  n == null ? '—' : `${n >= 0 ? '+' : ''}${Number(n).toFixed(2)}%`;

export const fmtNum = (n) => {
  if (n == null) return '—';
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
};

export const fmtTime = (ms) => {
  const d = new Date(ms);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const fmtDate = (ms) =>
  new Date(ms).toLocaleDateString([], { month: 'short', day: 'numeric' });

export const isMarketOpen = () => {
  const now = new Date();
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = et.getDay();
  const h = et.getHours();
  const m = et.getMinutes();
  const mins = h * 60 + m;
  return day >= 1 && day <= 5 && mins >= 570 && mins < 960; // 9:30–16:00 ET
};
