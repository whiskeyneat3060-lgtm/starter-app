import type { PagesFunction } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
  APP_PIN: string;
}

function generateToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = await context.request.json<{ pin: string }>();
    const expectedPin = context.env.APP_PIN || '1234';

    if (body.pin !== expectedPin) {
      return new Response(JSON.stringify({ error: 'Invalid PIN' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const token = generateToken();
    await context.env.DB.prepare(
      'INSERT INTO sessions (token, user_id) VALUES (?, 1)'
    ).bind(token).run();

    const isSecure = new URL(context.request.url).protocol === 'https:';
    const cookieFlags = isSecure ? 'HttpOnly; Secure; SameSite=Strict' : 'HttpOnly; SameSite=Strict';

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `session=${token}; Path=/; ${cookieFlags}; Max-Age=2592000`,
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Bad request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
