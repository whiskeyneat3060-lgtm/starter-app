# Recomp OS — Gap Analysis

_Last updated: 2026-06-19 (Revision Prompt #2)_

## Executive Summary

Recomp OS is a focused, opinionated body-recomposition tool, not a general calorie
counter — and that focus is both its biggest strength and its biggest liability.
Where the incumbents (MyFitnessPal, Cronometer, LoseIt, MacroFactor) win on breadth
of food data and frictionless logging, Recomp OS wins on the analytical layer:
InBody OCR ingestion, AI free-text food analysis, fat/lean projection against a
target body-fat percentage, and adaptive TDEE. The critical gaps were all on the
**input** side — no barcode scanner, no real searchable food database, and (until
this revision) no recents/copy-meal shortcuts to reduce daily logging friction.
Closing those input gaps is the difference between a clever dashboard and a tool
someone actually logs into every day.

## Feature Comparison

| Feature | Recomp OS | MyFitnessPal | Cronometer | LoseIt | MacroFactor |
|---|---|---|---|---|---|
| Barcode scanning | ❌ | ✅ | ✅ | ✅ | ✅ |
| Large verified food DB | ❌ (OFF fallback only) | ✅ | ✅ (best micros) | ✅ | ✅ |
| AI free-text / photo analysis | ✅ | partial (premium) | ❌ | partial | ✅ |
| Recent foods / quick-tap | ✅ (this revision) | ✅ | ✅ | ✅ | ✅ |
| Copy meal / copy day | ✅ (this revision) | ✅ | ✅ | ✅ | ✅ |
| Custom foods & saved meals | ✅ | ✅ | ✅ | ✅ | ✅ |
| Adaptive TDEE | ✅ (this revision) | ❌ | ❌ | partial | ✅ (flagship) |
| Body-recomp / fat-lean projection | ✅ | ❌ | ❌ | ❌ | partial |
| InBody / DEXA OCR import | ✅ | ❌ | manual | ❌ | manual |
| Fibre tracking | ✅ | ✅ | ✅ | partial | ✅ |
| Full micronutrients | ❌ | partial | ✅ | partial | partial |
| Configurable macro targets | ✅ (this revision) | ✅ | ✅ | ✅ | ✅ (auto) |
| Configurable water goal | ✅ (this revision) | ✅ | ✅ | ✅ | ❌ |
| Streak / habit tracking | ✅ (this revision) | ✅ | ✅ | ✅ | ❌ |
| Wearable / Garmin sync | ✅ | ✅ | ✅ | ✅ | ✅ |

## Our Strengths

- **InBody OCR** — drop in a scan photo and the app extracts weight, body-fat %,
  fat mass, lean mass, skeletal muscle, BMR and visceral fat. No competitor does
  this automatically; they all require manual entry.
- **AI free-text analysis** — log "two boiled eggs and a banana" and get macros
  back, with an Open Food Facts fast-path before falling back to the model.
- **Body-recomp projections** — `computeProjection` partitions energy balance into
  fat vs lean change and projects a goal date against a target body-fat %, with
  AHEAD / ON_TRACK / BEHIND status. This is the analytical core competitors lack.
- **Fibre tracking** — fibre is a first-class macro on every entry, not an
  afterthought.

## Critical Gaps

1. **No barcode scanning** — the single biggest friction point for packaged-food
   logging. Every competitor has it. _(still open)_
2. **No real food database** — we lean on Open Food Facts search + AI, which is
   fine for whole foods but weak for branded/restaurant items and portion sizes.
   _(still open)_
3. ~~No recents~~ — **closed this revision** (`/api/food/recents`, quick-tap chips).
4. ~~No adaptive TDEE~~ — **closed this revision** (`/api/tdee`, 14-day estimate).
5. ~~No copy-meal / copy-day~~ — **closed this revision** (`/api/food/copy-day`).
6. ~~Hardcoded macro targets~~ — **closed this revision** (Settings page + profile columns).
7. **No full micronutrient tracking** — Cronometer's main differentiator. _(still open)_

## Prioritized Roadmap

| Priority | Item | Status | Effort |
|---|---|---|---|
| 1 | Recent foods + quick-tap | ✅ done | S |
| 2 | Copy day / copy meal | ✅ done | S |
| 3 | Configurable macro targets (Settings) | ✅ done | M |
| 4 | Configurable water goal | ✅ done | S |
| 5 | Adaptive TDEE | ✅ done | M |
| 6 | Streak tracking | ✅ done | S |
| 7 | Barcode scanning (camera + OFF lookup) | open | M |
| 8 | Real food DB search w/ portions | open | L |
| 9 | Full micronutrient panel | open | L |
| 10 | Reminders / notifications | open | M |
