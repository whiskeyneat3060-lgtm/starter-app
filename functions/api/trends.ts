import type { PagesFunction } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const range = url.searchParams.get('range') || '30d';

  let days = 30;
  if (range === '90d') days = 90;
  else if (range === '6mo') days = 180;

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);

  const [rollups, scans] = await Promise.all([
    context.env.DB.prepare(
      'SELECT * FROM daily_rollup WHERE user_id = 1 AND date >= ? ORDER BY date ASC'
    ).bind(sinceStr).all(),

    context.env.DB.prepare(
      'SELECT * FROM inbody_scans WHERE user_id = 1 AND scan_date >= ? ORDER BY scan_date ASC'
    ).bind(sinceStr).all(),
  ]);

  return new Response(JSON.stringify({
    rollups: rollups.results ?? [],
    scans: scans.results ?? [],
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
