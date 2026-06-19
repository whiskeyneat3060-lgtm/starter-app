import type { PagesFunction } from '@cloudflare/workers-types';

interface Env {
  ANTHROPIC_API_KEY: string;
  CLAUDE_MODEL: string;
}

interface Component {
  description: string;
  kcal: number;
  protein_g: number;
}

function guessName(components: Component[]): string {
  const total_kcal = components.reduce((s, c) => s + c.kcal, 0);
  const total_protein = components.reduce((s, c) => s + c.protein_g, 0);
  const desc = components.map(c => c.description.toLowerCase()).join(' ');
  if (desc.includes('shake') || desc.includes('protein powder')) return 'Protein Shake';
  if (desc.includes('oat') || desc.includes('yogurt') || desc.includes('egg') && total_kcal < 600) return 'Breakfast Bowl';
  if (total_protein > 40 && desc.includes('chicken')) return 'Chicken & Rice';
  if (desc.includes('salad')) return 'Salad Bowl';
  if (total_kcal > 700) return 'Big Meal';
  return 'My Meal';
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  let body: { components: Component[] };
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const components = body.components ?? [];

  if (context.env?.ANTHROPIC_API_KEY) {
    try {
      const model = context.env.CLAUDE_MODEL || 'claude-opus-4-8';
      const itemList = components.map(c => `- ${c.description} (${Math.round(c.kcal)} kcal)`).join('\n');
      const prompt = `Name this meal in 2-4 words. Meal components:\n${itemList}\n\nReturn ONLY JSON: {"name": "Meal Name"}`;

      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': context.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({ model, max_tokens: 64, messages: [{ role: 'user', content: prompt }] }),
      });

      const data = await resp.json<{ content: Array<{ text: string }> }>();
      const text = data.content?.[0]?.text ?? '';
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]) as { name?: string };
        if (parsed.name) {
          return new Response(JSON.stringify({ name: parsed.name }), { headers: { 'Content-Type': 'application/json' } });
        }
      }
    } catch {
      // fall through
    }
  }

  return new Response(JSON.stringify({ name: guessName(components) }), { headers: { 'Content-Type': 'application/json' } });
};
