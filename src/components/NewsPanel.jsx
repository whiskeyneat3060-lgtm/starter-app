import { timeAgo, fmtDate } from '../utils/formatters.js';

export function NewsPanel({ news, symbol }) {
  if (!news)           return <div className="panel-empty">Loading news…</div>;
  if (!news.length)    return <div className="panel-empty">No recent news for {symbol}.</div>;
  return (
    <div className="news-panel">
      {news.map((n, i) => (
        <a key={i} href={n.link} target="_blank" rel="noopener noreferrer"
           className="news-item" onClick={e => e.stopPropagation()}>
          <div className="news-title">{n.title}</div>
          <div className="news-meta">
            <span className="news-pub">{n.publisher}</span>
            <span className="news-age">{timeAgo(n.time)}</span>
          </div>
        </a>
      ))}
    </div>
  );
}
