import { fmtDate, fmtTime } from '../utils/formatters.js';

function timeAgo(ms) {
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return fmtDate(ms);
}

export function NewsPanel({ news, symbol }) {
  if (!news) return <div className="panel-empty">Loading news…</div>;
  if (news.length === 0) return <div className="panel-empty">No recent news for {symbol}.</div>;

  return (
    <div className="news-panel">
      {news.map((n, i) => (
        <a
          key={i}
          href={n.link}
          target="_blank"
          rel="noopener noreferrer"
          className="news-item"
          onClick={e => e.stopPropagation()}
        >
          <div className="news-title">{n.title}</div>
          <div className="news-meta">
            <span className="news-publisher">{n.publisher}</span>
            <span className="news-time">{timeAgo(n.time)}</span>
          </div>
        </a>
      ))}
    </div>
  );
}
