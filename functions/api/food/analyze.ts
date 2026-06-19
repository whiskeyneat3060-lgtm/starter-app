import type { PagesFunction } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
  ANTHROPIC_API_KEY: string;
  CLAUDE_MODEL: string;
}

interface FoodItem {
  name: string;
  portion: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fibre_g: number;
}

interface FoodAnalysis {
  description: string;
  confidence: number;
  items: FoodItem[];
  totals: {
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fibre_g: number;
  };
}

function getMealBucket(hour: number): string {
  if (hour >= 5 && hour < 10.5) return 'breakfast';
  if (hour >= 10.5 && hour < 15) return 'lunch';
  if (hour >= 15 && hour < 18.5) return 'snack';
  return 'dinner';
}

function getMockAnalysis(): FoodAnalysis {
  return {
    description: 'Grilled chicken with rice and vegetables',
    confidence: 0.85,
    items: [
      { name: 'Grilled chicken breast', portion: '150g', kcal: 248, protein_g: 47, carbs_g: 0, fat_g: 5, fibre_g: 0 },
      { name: 'Brown rice', portion: '150g cooked', kcal: 165, protein_g: 4, carbs_g: 35, fat_g: 1, fibre_g: 2 },
      { name: 'Mixed vegetables', portion: '100g', kcal: 50, protein_g: 3, carbs_g: 8, fat_g: 1, fibre_g: 3 },
    ],
    totals: { kcal: 463, protein_g: 54, carbs_g: 43, fat_g: 7, fibre_g: 5 },
  };
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const now = new Date();
  const hour = now.getHours() + now.getMinutes() / 60;
  const mealBucket = getMealBucket(hour);
  const capturedAt = now.toISOString();

  let analysis: FoodAnalysis;

  if (context.env.ANTHROPIC_API_KEY) {
    try {
      const formData = await context.request.formData();
      const imageFile = formData.get('image') as File | null;

      let imageContent: unknown = null;
      if (imageFile) {
        const bytes = await imageFile.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(bytes)));
        imageContent = {
          type: 'image',
          source: {
            type: 'base64',
            media_type: imageFile.type || 'image/jpeg',
            data: base64,
          },
        };
      }

      const model = context.env.CLAUDE_MODEL || 'claude-opus-4-8';
      const prompt = `Analyze this food image and return ONLY a JSON object with this exact structure:
{
  "description": "brief description of the meal",
  "confidence": 0.0-1.0,
  "items": [
    {
      "name": "food item name",
      "portion": "portion description",
      "kcal": number,
      "protein_g": number,
      "carbs_g": number,
      "fat_g": number,
      "fibre_g": number
    }
  ],
  "totals": {
    "kcal": number,
    "protein_g": number,
    "carbs_g": number,
    "fat_g": number,
    "fibre_g": number
  }
}
Return ONLY the JSON, no other text.`;

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
        body: JSON.stringify({
          model,
          max_tokens: 1024,
          messages,
        }),
      });

      const data = await resp.json<{ content: Array<{ text: string }> }>();
      const text = data.content?.[0]?.text ?? '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]) as FoodAnalysis;
      } else {
        analysis = getMockAnalysis();
      }
    } catch {
      analysis = getMockAnalysis();
    }
  } else {
    analysis = getMockAnalysis();
  }

  // Save to food_entries
  await context.env.DB.prepare(
    `INSERT INTO food_entries (user_id, captured_at, meal_bucket, description, confidence, kcal, protein_g, carbs_g, fat_g, fibre_g, items_json)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    capturedAt,
    mealBucket,
    analysis.description,
    analysis.confidence,
    analysis.totals.kcal,
    analysis.totals.protein_g,
    analysis.totals.carbs_g,
    analysis.totals.fat_g,
    analysis.totals.fibre_g,
    JSON.stringify(analysis.items),
  ).run();

  return new Response(JSON.stringify(analysis), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
