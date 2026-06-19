import type { PagesFunction } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
}

interface SavedMealComponent {
  id?: number;
  saved_meal_id?: number;
  description: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fibre_g: number;
  quantity: number;
}

interface SavedMeal {
  id: number;
  user_id: number;
  name: string;
  auto_named: number;
  meal_bucket_hint: string | null;
  created_at: string;
  components?: SavedMealComponent[];
  total_kcal?: number;
  total_protein_g?: number;
}

const SEED_MEALS: SavedMeal[] = [
  {
    id: 1, user_id: 1, name: 'Post-Workout Meal', auto_named: 1, meal_bucket_hint: 'lunch',
    created_at: '2026-06-01T00:00:00Z',
    components: [
      { id: 1, saved_meal_id: 1, description: 'Chicken breast 150g', kcal: 248, protein_g: 47, carbs_g: 0, fat_g: 5, fibre_g: 0, quantity: 1 },
      { id: 2, saved_meal_id: 1, description: 'Brown rice 200g cooked', kcal: 220, protein_g: 5, carbs_g: 47, fat_g: 1, fibre_g: 2, quantity: 1 },
    ],
    total_kcal: 468,
    total_protein_g: 52,
  },
];

export const onRequest: PagesFunction<Env> = async (context) => {
  const method = context.request.method;
  const url = new URL(context.request.url);

  if (method === 'GET') {
    if (!context.env?.DB) {
      return new Response(JSON.stringify(SEED_MEALS), { headers: { 'Content-Type': 'application/json' } });
    }
    const meals = await context.env.DB.prepare(
      'SELECT * FROM saved_meals WHERE user_id = 1 ORDER BY created_at DESC'
    ).all<SavedMeal>();
    const result: SavedMeal[] = [];
    for (const meal of meals.results ?? []) {
      const comps = await context.env.DB.prepare(
        'SELECT * FROM saved_meal_components WHERE saved_meal_id = ?'
      ).bind(meal.id).all<SavedMealComponent>();
      const components = comps.results ?? [];
      meal.components = components;
      meal.total_kcal = components.reduce((s, c) => s + c.kcal * c.quantity, 0);
      meal.total_protein_g = components.reduce((s, c) => s + c.protein_g * c.quantity, 0);
      result.push(meal);
    }
    return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
  }

  if (method === 'POST') {
    let body: { name?: string; meal_bucket_hint?: string; components?: SavedMealComponent[] };
    try {
      body = await context.request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const components = body.components ?? [];
    const name = body.name ?? 'My Meal';
    const total_kcal = components.reduce((s, c) => s + c.kcal * (c.quantity ?? 1), 0);
    const total_protein_g = components.reduce((s, c) => s + c.protein_g * (c.quantity ?? 1), 0);

    const newMeal: SavedMeal = {
      id: Math.floor(Math.random() * 100000),
      user_id: 1,
      name,
      auto_named: 0,
      meal_bucket_hint: body.meal_bucket_hint ?? null,
      created_at: new Date().toISOString(),
      components,
      total_kcal,
      total_protein_g,
    };

    if (context.env?.DB) {
      try {
        const mealRow = await context.env.DB.prepare(
          `INSERT INTO saved_meals (user_id, name, auto_named, meal_bucket_hint) VALUES (1, ?, 0, ?) RETURNING *`
        ).bind(name, body.meal_bucket_hint ?? null).first<SavedMeal>();
        if (mealRow) {
          for (const comp of components) {
            await context.env.DB.prepare(
              `INSERT INTO saved_meal_components (saved_meal_id, description, kcal, protein_g, carbs_g, fat_g, fibre_g, quantity) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
            ).bind(mealRow.id, comp.description, comp.kcal, comp.protein_g, comp.carbs_g, comp.fat_g, comp.fibre_g, comp.quantity ?? 1).run();
          }
          mealRow.components = components;
          mealRow.total_kcal = total_kcal;
          mealRow.total_protein_g = total_protein_g;
          return new Response(JSON.stringify(mealRow), { status: 201, headers: { 'Content-Type': 'application/json' } });
        }
      } catch {
        // fall through
      }
    }

    return new Response(JSON.stringify(newMeal), { status: 201, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response('Method Not Allowed', { status: 405 });
};
