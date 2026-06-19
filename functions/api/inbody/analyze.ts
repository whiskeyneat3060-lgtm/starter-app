import type { PagesFunction } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
  ANTHROPIC_API_KEY: string;
  CLAUDE_MODEL: string;
}

interface InBodyData {
  scan_date: string;
  weight_kg?: number;
  bodyfat_pct?: number;
  fat_mass_kg?: number;
  skeletal_muscle_kg?: number;
  lean_mass_kg?: number;
  bmr?: number;
  visceral_fat?: number;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const now = new Date();
  let extracted: InBodyData = { scan_date: now.toISOString().slice(0, 10) };

  if (context.env.ANTHROPIC_API_KEY) {
    try {
      const formData = await context.request.formData();
      const file = formData.get('file') as File | null;

      let imageContent: unknown = null;
      if (file) {
        const bytes = await file.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(bytes)));
        imageContent = {
          type: 'image',
          source: {
            type: 'base64',
            media_type: file.type || 'image/jpeg',
            data: base64,
          },
        };
      }

      const model = context.env.CLAUDE_MODEL || 'claude-opus-4-8';
      const prompt = `Extract InBody scan data from this image/document. Return ONLY a JSON object:
{
  "scan_date": "YYYY-MM-DD",
  "weight_kg": number or null,
  "bodyfat_pct": number or null,
  "fat_mass_kg": number or null,
  "skeletal_muscle_kg": number or null,
  "lean_mass_kg": number or null,
  "bmr": number or null,
  "visceral_fat": number or null
}`;

      const messages: unknown[] = imageContent
        ? [{ role: 'user', content: [imageContent, { type: 'text', text: prompt }] }]
        : [{ role: 'user', content: prompt }];

      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': context.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({ model, max_tokens: 512, messages }),
      });

      const data = await resp.json<{ content: Array<{ text: string }> }>();
      const text = data.content?.[0]?.text ?? '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extracted = JSON.parse(jsonMatch[0]) as InBodyData;
      }
    } catch {
      // fall through with defaults
    }
  }

  await context.env.DB.prepare(
    `INSERT INTO inbody_scans (user_id, scan_date, weight_kg, bodyfat_pct, fat_mass_kg, skeletal_muscle_kg, lean_mass_kg, bmr, visceral_fat, raw_extract_json)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    extracted.scan_date,
    extracted.weight_kg ?? null,
    extracted.bodyfat_pct ?? null,
    extracted.fat_mass_kg ?? null,
    extracted.skeletal_muscle_kg ?? null,
    extracted.lean_mass_kg ?? null,
    extracted.bmr ?? null,
    extracted.visceral_fat ?? null,
    JSON.stringify(extracted),
  ).run();

  return new Response(JSON.stringify({ ok: true, data: extracted }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
