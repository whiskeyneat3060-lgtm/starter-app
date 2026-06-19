# Architecture Decisions — Recomp OS

## Tech Stack

### Frontend: Vite + React + TypeScript + Tailwind CSS v3
- Vite chosen for fast HMR and simple Cloudflare Pages integration (static output).
- Tailwind v3 (not v4) for stable utility-first CSS with full JIT support.
- TypeScript throughout for correctness in projection math and API contracts.

### Backend: Cloudflare Pages Functions
- Colocation with static frontend; no separate API server needed.
- Workers runtime: fast cold starts, edge-global deployment.
- All AI calls (Anthropic) happen server-side only — API key never exposed to browser.

### Database: Cloudflare D1 (SQLite)
- SQLite semantics with D1's global read replicas.
- Schema in /migrations for version-controlled, reproducible setup.
- Seed data in /migrations/002_seed.sql for local dev and demo.

### State Management: TanStack Query v5
- Server-state focused; no Redux needed.
- Seed data served in dev (USE_SEED flag) to allow UI work without Cloudflare workers.

### Charts: Recharts
- Declarative React charts; good TypeScript support; responsive containers.

## Auth

### Single PIN gate
- Decision: no username/password, no OAuth — single shared PIN for personal use.
- HTTP-only session cookie (30 days) prevents XSS token theft.
- Session stored in D1 `sessions` table; deleted on logout.
- In dev mode, auth guard bypasses redirect so UI can be developed without a running API.

## AI Integration

### Food analysis
- Anthropic vision API called server-side via Pages Function.
- Falls back to mock data if `ANTHROPIC_API_KEY` is not set, enabling dev without an API key.
- Model configurable via `CLAUDE_MODEL` env var; defaults to `claude-opus-4-8`.
- Response parsed as structured JSON; saved directly to `food_entries`.

### InBody extraction
- Same pattern: Anthropic vision API to extract structured scan data from photos/PDFs.

## Projection Engine

### Location: src/lib/projection.ts (pure TypeScript)
- No side effects, fully testable.
- 7700 kcal/kg fat constant.
- 85% fat partition in deficit (standard assumption; configurable).
- Status bands: ±100 kcal/day tolerance for ON_TRACK.
- Projects goal date from trailing 7-day weekly fat change rate.

## Garmin Integration

### GitHub Actions + Python garminconnect
- Runs every 6 hours via cron.
- POSTs to `/api/ingest/garmin` with `X-Ingest-Secret` header.
- Upserts burn_entries and daily_rollup; safe to run multiple times.

## Data Model

### daily_rollup table
- Maintained as a materialized summary for fast dashboard queries.
- Updated by ingest endpoint and food analysis on every write.

### meal_bucket
- Derived from time-of-day using configurable window (`meal_window_config_json` in profiles).
- Default windows: breakfast 5-10:30, lunch 10:30-15:00, snack 15:00-18:30, dinner 18:30-23:00.

## UI

### Dark theme custom palette
- bg-base (#0A0A0C) → near black for OLED efficiency.
- accent-energy (#00E5FF) → cyan for energy/intake ring.
- accent-goal (#A855F7) → purple for goal progress ring.

### Mobile-first layout
- Fixed BottomNav (4 tabs) + FAB (camera, log food).
- All cards use rounded-2xl, consistent 16px padding.
- Horizontal scroll for meal cards (scrollbar-hide).
