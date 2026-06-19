import type { PagesFunction } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
  ANTHROPIC_API_KEY: string;
  APP_PIN: string;
  INGEST_SHARED_SECRET: string;
  CLAUDE_MODEL: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);

  // Only protect API routes; let static assets and the SPA through
  if (!url.pathname.startsWith('/api/')) {
    return context.next();
  }

  // Auth and init endpoints are public
  if (url.pathname.startsWith('/api/auth/') || url.pathname === '/api/init') {
    return context.next();
  }

  // No DB = demo mode: allow any request with a session cookie, or no session for non-data routes
  if (!context.env.DB) {
    return context.next();
  }

  // With DB, validate session cookie

  const cookieHeader = context.request.headers.get('Cookie') || '';
  const match = cookieHeader.match(/session=([^;]+)/);
  const token = match ? match[1] : null;

  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const session = await context.env.DB.prepare(
    'SELECT user_id FROM sessions WHERE token = ?'
  ).bind(token).first<{ user_id: number }>();

  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  (context as unknown as Record<string, unknown>).userId = session.user_id;

  return context.next();
};
