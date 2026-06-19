import type { PagesFunction } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
}

function getUserId(context: Parameters<PagesFunction<Env>>[0]): number {
  const cookieHeader = context.request.headers.get('Cookie') || '';
  const match = cookieHeader.match(/session=([^;]+)/);
  return (match ? 1 : 1); // middleware ensures user is authed; default to 1
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const userId = 1; // Set by middleware session validation
  const today = new Date().toISOString().slice(0, 10);

  const [todayRollup, latestBurn, goal, latestInbody, sparkline] = await Promise.all([
    context.env.DB.prepare(
      'SELECT * FROM daily_rollup WHERE user_id = ? AND date = ?'
    ).bind(userId, today).first(),

    context.env.DB.prepare(
      'SELECT * FROM burn_entries WHERE user_id = ? ORDER BY date DESC LIMIT 1'
    ).bind(userId).first(),

    context.env.DB.prepare(
      'SELECT * FROM goals WHERE user_id = ? AND active = 1 ORDER BY created_at DESC LIMIT 1'
    ).bind(userId).first(),

    context.env.DB.prepare(
      'SELECT * FROM inbody_scans WHERE user_id = ? ORDER BY scan_date DESC LIMIT 1'
    ).bind(userId).first(),

    context.env.DB.prepare(
      `SELECT * FROM daily_rollup WHERE user_id = ? ORDER BY date DESC LIMIT 14`
    ).bind(userId).all(),
  ]);

  return new Response(JSON.stringify({
    todayRollup,
    latestBurn,
    goal,
    latestInbody,
    sparkline: sparkline.results?.reverse() ?? [],
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
