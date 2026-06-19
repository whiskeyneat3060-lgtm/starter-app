# Gap Analysis: Recomp OS vs. MFP / Cronometer / LoseIt / MacroFactor

> Analysis date: 2026-06-19  
> Codebase: Cloudflare Pages + React 19 + D1 (Sqlite) + Claude AI backend

---

## Feature Gap Table

| Feature | MFP / Cronometer / LoseIt / MacroFactor have it | We have it | Priority | Plan |
|---|---|---|---|---|
| **Food logging — text / NL** | All have it (MFP search bar, MF coaching input) | YES — `POST /api/food/text-log` calls Claude to parse free-text; UI sheet in Log.tsx | — | Solid. Add recent-history context to the Claude prompt for better accuracy |
| **Food logging — photo** | MFP (Premium), Lose It (Snap It), MacroFactor (photo) | PARTIAL — `POST /api/food/analyze` accepts an image and calls Claude vision; UI has a camera-icon FAB but no explicit photo-log flow wired in Log.tsx | High | Wire photo capture into Log.tsx sheet; show per-item breakdown from `FoodAnalyzeResult.items` |
| **Food logging — voice** | MFP (mobile only), Lose It, MacroFactor | NO — not wired anywhere in UI or API | Medium | Add Web Speech API `SpeechRecognition` in the text-log sheet; transcribed text feeds existing `/api/food/text-log` |
| **Food logging — barcode scan** | All four have it as a core feature | NO — no barcode API endpoint, no camera-barcode UI | High | Integrate `@zxing/browser` or native BarcodeDetector API → look up barcode in Open Food Facts → pre-fill custom-food form |
| **Food database & search (Open Food Facts / USDA)** | All four maintain or query large food DBs | NO — all nutrition comes from Claude inference or manual entry; no structured food search | High | Add `GET /api/food/search?q=` backed by Open Food Facts REST API (free, no key); cache results in D1 `food_cache` table |
| **Custom foods** | All four | YES — `GET/POST /api/custom-foods`, `CustomFood` type, UI sheet in Log.tsx | — | Add edit/delete endpoints; add brand + USDA fields |
| **Saved meals / recipes** | All four | YES — `GET/POST /api/saved-meals`, `SavedMeal` type, `nameSavedMeal` AI naming, UI "Build Meal" sheet | — | Add delete + log-saved-meal-as-entry flow; show total macros before logging |
| **Quick-add (calories only)** | All four | YES — "Quick Add" sheet in Log.tsx with kcal, protein, carbs, fat fields | — | Currently requires all four macros; truly quick-add should allow kcal-only with zeroed macros |
| **Recents & favorites** | All four show recent foods prominently | NO — no recents list, no favorite flag on food entries or custom foods | High | Add `is_favourite` flag to `custom_foods` table; add `GET /api/food/recents` querying last-N distinct entries |
| **Copy meal (copy yesterday's log)** | MFP (copy day), Cronometer (copy day) | NO — no copy-meal endpoint or UI | Medium | Add `POST /api/food/copy-day?from=DATE&to=DATE`; add "Copy Yesterday" button in Log header |
| **Micronutrient tracking (vitamins, minerals)** | Cronometer (best-in-class), MFP (limited), MacroFactor (minerals) | NO — `FoodEntry` and `TextLogResult` only store kcal, protein, carbs, fat, fibre | Low | Requires food DB (Open Food Facts has full micronutrient data); extend `food_entries` schema with vitamin/mineral columns; render in a collapsible "micros" panel |
| **Fibre tracking** | All four | YES — `fibre_g` stored in `FoodEntry`, `CustomFood`, `SavedMealComponent`, `FoodAnalyzeResult`; displayed in Dashboard macroTargets | — | Already stored; ensure Dashboard MacroBar surfaces it |
| **Water tracking** | MFP, Cronometer, Lose It | YES — `GET/POST /api/water`, `WaterData` type, water card in Log.tsx | — | Water goal is hardcoded at 2500 ml; make it user-configurable |
| **Weight logging** | All four | YES — `GET/POST /api/weight`, `WeightEntry` type, weight sheet in Log.tsx | — | Good foundation |
| **Weight trend smoothing (EWMA)** | MacroFactor (signature feature), others offer moving avg | YES — EWMA computed server-side (`smoothed_kg` in `WeightEntry`), displayed on Trends chart | — | Excellent. Expose alpha parameter as a user setting |
| **Calorie & macro goals** | All four | PARTIAL — `macroTargets` exist in `DashboardData` (kcal, protein, carbs, fat); `Goal` type exists; no UI to set macro splits directly | High | Add macro-split editor to Goals page; persist in `goals` table or a separate `macro_targets` table |
| **Adaptive TDEE** | MacroFactor (core feature), MFP (recent addition) | NO — TDEE is taken from Garmin burn data; no algorithm to estimate TDEE from weight + intake trends | High | Implement MacroFactor-style regression: given weight trend + logged intake → back-calculate TDEE; update weekly; store in `tdee_estimates` table |
| **Reminders & streaks** | MFP (reminders, streaks), Lose It, Cronometer | NO — no push notification infrastructure, no streak counter | Low | PWA Push API or email reminders via Cloudflare Email Workers; streak counter from consecutive days with food entries |
| **Reporting & insights** | All four have weekly/monthly summaries | PARTIAL — Trends page has energy-balance charts, intake-vs-burn area chart, weekly bar chart; no narrative text insights | Medium | Add AI-generated weekly summary via Claude (`POST /api/insights/weekly`); render in Trends or new Insights tab |
| **Data export (CSV)** | MFP (CSV premium), Cronometer (CSV free), MacroFactor | YES — `GET /api/export` returns food log CSV with date range params | — | Extend to export weight, water, and burn data; add to a Settings page |
| **Body composition tracking (InBody)** | None of the four have InBody scan OCR | YES — `POST /api/inbody/analyze` with Claude OCR; `InbodyScan` type; shown in Trends | — | Unique differentiator. Add manual-entry fallback for users without InBody access |
| **Garmin burn integration** | MacroFactor (wearable sync), MFP (Apple Health) | PARTIAL — `GET /api/ingest/garmin` endpoint exists; `BurnEntry` type; `source: 'garmin'` flag | Medium | Need OAuth or webhook flow documented; currently unclear how Garmin data actually enters the system |
| **Multi-user / profiles** | All four | PARTIAL — `user_id` in all DB tables; PIN auth exists; `Profile` type defined but no profile API visible | Medium | Add `GET/PATCH /api/profile` to expose height, sex, birth_date for TDEE and BMR calculations; `mifflinBmr` is already implemented in `projection.ts` |

---

## Summary

**What we genuinely have (and do well):**
- AI-powered text logging (Claude NLP → macros)
- AI photo analysis for food
- InBody OCR scan import (unique vs. competitors)
- Weight logging with EWMA smoothing
- Water tracking
- Custom foods + saved meals with AI naming
- Quick-add sheet
- CSV export
- Body-recomp projection engine (`projection.ts`) — a real differentiator
- Garmin burn data ingestion skeleton

**Critical gaps vs. competitors:**
1. Barcode scanning (expected by every user)
2. Structured food database / search (Open Food Facts or USDA)
3. Recents / favorites list
4. Adaptive TDEE estimation
5. Calorie/macro goal configuration UI
6. Voice logging
7. Copy-meal / copy-day

**Acceptable gaps for now (niche or complex):**
- Full micronutrients (requires food DB first)
- Push reminders / streaks
- Multi-user management UI
