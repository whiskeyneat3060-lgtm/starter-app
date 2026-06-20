# Test Report — Recomp OS (Revision Prompt #2)

_Generated: 2026-06-19_

## Test Plan

The goal of this suite is to lock down the pure business logic and the seed-mode
contract of the client API layer, which together cover the highest-risk surfaces
introduced in this revision (projection math, adaptive TDEE, macro arithmetic) and
the guarantee that the UI renders offline/in-dev without a live backend.

Runner: **Vitest 4** with `jsdom`, `globals: true`, and a `@testing-library/jest-dom`
setup file. Config lives in `vite.config.ts` under the `test` key.

Run with: `npm run test` (CI / one-shot) or `npm run test:ui` (interactive).

## Test Files

| File | What it covers |
|---|---|
| `src/tests/projection.test.ts` | `projectionDays()` — days-to-goal, weekly fat loss, weekly lean change, future projected date for bf 20%→12%, lean 66kg, TDEE 2270. |
| `src/tests/macro-math.test.ts` | Macro energy identity (P·4 + C·4 + F·9 ≈ kcal target) and the all-zero edge case. |
| `src/tests/tdee.test.ts` | `estimateTdee()` — stable weight returns avg intake; 1kg loss over 14d at 1900 kcal → ~2450; surplus path. |
| `src/tests/api.test.ts` | Seed-mode shape of `getDashboard`, `getWater`, `getWeight`, `getTrends`, `getTdee`, `getRecentFoods`, `getProfile` (PROD falsy under vitest). |

## Pass / Fail Counts

- **Test files:** 4 passed / 4 total
- **Tests:** 19 passed / 19 total
- **Failures:** 0

## Run History (3 consecutive runs)

| Run | Timestamp (UTC) | Result |
|---|---|---|
| 1 | 2026-06-19T18:49:32Z | ✅ 4 files, 19 tests passed |
| 2 | 2026-06-19T18:49:38Z | ✅ 4 files, 19 tests passed |
| 3 | 2026-06-19T18:49:41Z | ✅ 4 files, 19 tests passed |

All three runs were green with identical counts; the suite is deterministic
(no reliance on wall-clock beyond "future date" assertions, which hold for any
positive day count).

## What Was Skipped

- **End-to-end (Playwright) tests** were deliberately deferred. This environment
  has no headless browser available, so E2E flows (login, logging a food entry,
  copy-from-yesterday, editing settings) cannot be exercised reliably. The
  `playwright` dependency is present in `package.json` for future local/CI use.
  See **ADR-011** in `DECISIONS.md`.
- **Pages Functions integration tests** (against a real D1 binding) were not run;
  the API endpoints are validated through their seed-mode (`!env.DB`) branches via
  `api.test.ts`. Full D1 coverage would require `wrangler` + Miniflare and is a
  follow-up.
- **Component render tests** beyond the API contract were kept minimal; the React
  Testing Library stack is installed and configured so these can be added without
  further setup.
