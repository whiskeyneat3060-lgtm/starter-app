import type { PagesFunction } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
  ANTHROPIC_API_KEY: string;
  CLAUDE_MODEL: string;
}

interface MacroResult {
  id: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fibre_g: number;
  description: string;
  meal_bucket: string;
}

function getMealBucket(bucketHint?: string): string {
  if (bucketHint) return bucketHint;
  const hour = new Date().getHours();
  if (hour < 10) return 'breakfast';
  if (hour < 14) return 'lunch';
  if (hour < 17) return 'snack';
  if (hour < 21) return 'dinner';
  return 'other';
}

function mockMacros(text: string): { kcal: number; protein_g: number; carbs_g: number; fat_g: number; fibre_g: number } {
  const t = text.toLowerCase();
  if (t.includes('egg')) return { kcal: 155, protein_g: 13, carbs_g: 1, fat_g: 11, fibre_g: 0 };
  if (t.includes('banana')) return { kcal: 89, protein_g: 1, carbs_g: 23, fat_g: 0, fibre_g: 3 };
  if (t.includes('chicken')) return { kcal: 335, protein_g: 50, carbs_g: 0, fat_g: 13, fibre_g: 0 };
  if (t.includes('rice')) return { kcal: 206, protein_g: 4, carbs_g: 45, fat_g: 0, fibre_g: 1 };
  if (t.includes('shake') || t.includes('protein')) return { kcal: 180, protein_g: 30, carbs_g: 10, fat_g: 3, fibre_g: 1 };
  if (t.includes('oat')) return { kcal: 307, protein_g: 11, carbs_g: 55, fat_g: 5, fibre_g: 8 };
  if (t.includes('salmon') || t.includes('fish')) return { kcal: 280, protein_g: 39, carbs_g: 0, fat_g: 13, fibre_g: 0 };
  if (t.includes('yogurt') || t.includes('yoghurt')) return { kcal: 130, protein_g: 12, carbs_g: 9, fat_g: 4, fibre_g: 0 };
  return { kcal: 300, protein_g: 20, carbs_g: 30, fat_g: 10, fibre_g: 3 };
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  let body: { text: string; meal_bucket?: string };
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const { text, meal_bucket: bucketHint } = body;
  if (!text?.trim()) {
    return new Response(JSON.stringify({ error: 'text required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const meal_bucket = getMealBucket(bucketHint);
  const capturedAt = new Date().toISOString();

  let macros: { kcal: number; protein_g: number; carbs_g: number; fat_g: number; fibre_g: number };
  let description = text.trim();

  if (context.env?.ANTHROPIC_API_KEY) {
    try {
      const model = context.env.CLAUDE_MODEL || 'claude-opus-4-8';
      const prompt = `The user logged this food: "${text}"

Return ONLY a JSON object:
{
  "description": "normalized food description",
  "kcal": number,
  "protein_g": number,
  "carbs_g": number,
  "fat_g": number,
  "fibre_g": number
}

Be accurate with portion sizes if specified. Return ONLY JSON.`;

      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': context.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 256,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      const data = await resp.json<{ content: Array<{ text: string }> }>();
      const rawText = data.content?.[0]?.text ?? '';
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]) as { description?: string; kcal?: number; protein_g?: number; carbs_g?: number; fat_g?: number; fibre_g?: number };
        description = parsed.description ?? description;
        macros = {
          kcal: parsed.kcal ?? 0,
          protein_g: parsed.protein_g ?? 0,
          carbs_g: parsed.carbs_g ?? 0,
          fat_g: parsed.fat_g ?? 0,
          fibre_g: parsed.fibre_g ?? 0,
        };
      } else {
        macros = mockMacros(text);
      }
    } catch {
      macros = mockMacros(text);
    }
  } else {
    macros = mockMacros(text);
  }

  let entryId = Math.floor(Math.random() * 100000) + 10000;

  if (context.env?.DB) {
    try {
      const result = await context.env.DB.prepare(
        `INSERT INTO food_entries (user_id, captured_at, meal_bucket, description, confidence, kcal, protein_g, carbs_g, fat_g, fibre_g)
         VALUES (1, ?, ?, ?, 0.9, ?, ?, ?, ?, ?) RETURNING id`
      ).bind(capturedAt, meal_bucket, description, macros.kcal, macros.protein_g, macros.carbs_g, macros.fat_g, macros.fibre_g).first<{ id: number }>();
      if (result?.id) entryId = result.id;
    } catch {
      // no DB
    }
  }

  const response: MacroResult = {
    id: entryId,
    description,
    meal_bucket,
    ...macros,
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
