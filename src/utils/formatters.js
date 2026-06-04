export const fmtPrice = (n, currency = '$') =>
  n == null ? '—' : `${currency}${Number(n).toFixed(2)}`;

export const fmtPct = (n) =>
  n == null ? '—' : `${n >= 0 ? '+' : ''}${Number(n).toFixed(2)}%`;

export const fmtNum = (n) => {
  if (n == null) return '—';
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
};

export const fmtTime = (ms) =>
  new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export const fmtDate = (ms) =>
  new Date(ms).toLocaleDateString([], { month: 'short', day: 'numeric' });

export const timeAgo = (ms) => {
  const d = Math.floor((Date.now() - ms) / 1000);
  if (d < 60)   return `${d}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  return `${Math.floor(d / 3600)}h ago`;
};

// ─── NASDAQ (NYSE hours, ET) ────────────────────────────────
export const isNasdaqOpen = () => {
  const et  = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = et.getDay();
  const min = et.getHours() * 60 + et.getMinutes();
  return day >= 1 && day <= 5 && min >= 570 && min < 960;
};

export const nasdaqCountdown = () => minutesUntil('America/New_York', 570, 960);

// ─── Euronext (Paris / CET) ─────────────────────────────────
export const isEuronextOpen = () => {
  const cet = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  const day = cet.getDay();
  const min = cet.getHours() * 60 + cet.getMinutes();
  return day >= 1 && day <= 5 && min >= 540 && min < 1050; // 9:00–17:30 CET
};

export const euronextCountdown = () => minutesUntil('Europe/Paris', 540, 1050);

function minutesUntil(tz, openMin, closeMin) {
  const local = new Date(new Date().toLocaleString('en-US', { timeZone: tz }));
  const day   = local.getDay();
  const cur   = local.getHours() * 60 + local.getMinutes();
  const isOpen = day >= 1 && day <= 5 && cur >= openMin && cur < closeMin;
  if (isOpen) {
    return { open: true, mins: closeMin - cur, label: 'Closes in' };
  }
  let minsUntil;
  if (cur < openMin && day >= 1 && day <= 5) {
    minsUntil = openMin - cur;
  } else {
    // next weekday open
    const daysUntilMon = day === 0 ? 1 : day === 6 ? 2 : 1;
    minsUntil = daysUntilMon * 1440 + openMin - cur;
  }
  return { open: false, mins: minsUntil, label: 'Opens in' };
}

export const formatCountdown = (mins) => {
  if (mins >= 1440) return `${Math.floor(mins / 1440)}d ${Math.floor((mins % 1440) / 60)}h`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

// ─── Confidence tier ─────────────────────────────────────────
export const confidenceTier = (c) => {
  if (c >= 95) return { label: 'ELITE',  cssClass: 'tier-elite',  icon: '🔥' };
  if (c >= 90) return { label: 'HIGH',   cssClass: 'tier-high',   icon: '⚡' };
  return             { label: 'STRONG', cssClass: 'tier-strong', icon: '✓'  };
};
