# Phase 2 Implementation Decisions

## Feature 1: Text Food Logging

- Open Food Facts is tried first; if a product with energy-kcal_100g data exists it is shown for confirmation before logging.
- If OFF returns no usable result, the call falls through to /api/food/text-log which invokes Claude.
- The flow never dead-ends: mock keyword-matching is used when no API key is set.
- Claude model: claude-opus-4-8 (overridable via CLAUDE_MODEL env var).

## Feature 2: Custom Foods

- Stored per user_id=1 (single-user app).
- Quick-log uses textLogFood with the food name and serving as the text input.
- Seed data (one example shake) is shown in demo mode.

## Feature 3: Saved Meals

- Components are stored flat with quantity multiplier.
- Auto-naming via Claude returns a 2-4 word name; fallback uses keyword heuristics.
- /api/saved-meals/name is a separate POST endpoint to keep naming stateless and reusable.

## Feature 4: Water Tracking

- Goal is hardcoded at 2500ml/day.
- Dashboard shows a green hydration ring alongside energy and goal rings (resized to 120px to fit three).
- Log page has quick-add buttons: 150 / 250 / 500 / 750ml.

## Feature 5: Weight Logging

- EWMA smoothing uses alpha=0.1 applied server-side.
- Trends page shows raw weight (dashed grey) and smoothed trend (cyan) on one chart.
- Seed data is 30 days with ~0.03kg/day downward drift and noise.

## Feature 6: Quick Add

- Opened via Quick Add button in Log page header.
- Posts to /api/food/text-log with a description string containing kcal.

## Feature 7: CSV Export

- Export button is a plain anchor with download attribute; browser handles the file.
- Endpoint accepts ?start= and ?end= query params for date filtering.
- No-DB path returns a static 2-day sample CSV.

## General

- All API functions handle missing context.env.DB by returning seed/mock data.
- USE_SEED in api.ts is true in dev, false in prod.
- Color tokens match the design system throughout.
