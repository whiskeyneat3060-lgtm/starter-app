# Architectural Decisions — Phase 2

> Created: 2026-06-19  
> Status: Draft — to be reviewed before implementation begins

---

## ADR-001: Food Database Strategy — Open Food Facts via API (no local mirror)

**Decision:** Query the Open Food Facts REST API (`https://world.openfoodfacts.org/api/v2/product/{barcode}` and `https://world.openfoodfacts.org/cgi/search.pl`) from the Cloudflare Worker, cache results in a D1 `food_cache` table (TTL 30 days).

**Why not USDA FoodData Central?**
- Requires a free API key and is US-centric.
- Open Food Facts is global, has barcode data, and is free with no key for low-volume use.

**Why not bundle a full food DB?**
- D1 has a 10 GB limit but importing USDA (390k items) or OFF (3M items) would take significant build effort and schema work. Caching on-demand is simpler to ship.

**Cache schema:**
```sql
CREATE TABLE food_cache (
  barcode TEXT PRIMARY KEY,
  name TEXT,
  brand TEXT,
  serving_desc TEXT,
  serving_grams REAL,
  kcal REAL,
  protein_g REAL,
  carbs_g REAL,
  fat_g REAL,
  fibre_g REAL,
  data_json TEXT,        -- full OFF response for future micro parsing
  fetched_at INTEGER     -- unix seconds for TTL checks
);
```

---

## ADR-002: Barcode Scanning — BarcodeDetector API with ZXing fallback

**Decision:** Use the native `BarcodeDetector` Web API (Chrome/Edge/Android) where available; fall back to `@zxing/browser` (pure JS) for Safari/Firefox. The detected barcode (EAN-13/UPC-A) is sent to `GET /api/food/barcode?code=...` which queries the food cache or Open Food Facts.

**Why not a React Native / Capacitor camera plugin?**
- The app is a PWA running in the browser. `BarcodeDetector` is now baseline on Chromium and available via a polyfill. No native build pipeline needed.

**UI flow:** FAB → "Scan Barcode" → camera sheet opens → on detect → pre-fill text-log or custom-food form with fetched nutrition data → user confirms → entry saved.

---

## ADR-003: Adaptive TDEE — Regression from Weight + Intake History

**Decision:** Implement a weekly TDEE update job computed on the server (triggered by a Cloudflare Cron Trigger or on-demand at dashboard load).

**Algorithm (MacroFactor-inspired):**
1. Take the last 28 days of `weight_entries` (smoothed EWMA) and `food_entries` (daily kcal totals).
2. Compute weekly average intake and weekly average weight change.
3. Back-calculate TDEE: `TDEE_estimated = avg_intake - (weight_change_kg_per_week * 7700 / 7)`.
4. Apply a low-pass filter (alpha=0.3 EWMA) over successive TDEE estimates to smooth noise.
5. Store in `tdee_estimates (user_id, week_start, tdee_kcal, confidence)`.
6. Surface as "Your estimated TDEE this week: X kcal" on Dashboard; use it to auto-set calorie targets.

**Why not use Garmin TDEE directly?**
- Garmin TDEE is based on activity tracking which can be wrong or absent. The regression approach is more accurate for body recomp because it's derived from actual weight change, which is the ground truth.

**Minimum data requirement:** At least 7 days of both food logs and weight entries before showing an estimate. Show `—` and a prompt to log more data if insufficient.

---

## ADR-004: Macro Goals — Separate `macro_targets` Table, Not Embedded in `goals`

**Decision:** Add a new `macro_targets` table instead of adding columns to `goals`.

**Rationale:** The `goals` table represents body-composition targets (body fat %, weight, lean mass, date). Macro targets are derived from those goals but can also be set independently. Separating them prevents the `goals` table from becoming a dumping ground.

**Schema:**
```sql
CREATE TABLE macro_targets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  kcal INTEGER NOT NULL,
  protein_g INTEGER NOT NULL,
  carbs_g INTEGER,
  fat_g INTEGER,
  fibre_g INTEGER DEFAULT 30,
  created_at TEXT DEFAULT (datetime('now')),
  active INTEGER DEFAULT 1
);
```

**API:** `GET/POST /api/macro-targets`. Dashboard already reads `macroTargets` from `/api/dashboard` — update that query to join `macro_targets`.

**Auto-suggest flow:** When a user saves a goal with target body fat % and date, the Goals page offers "Auto-calculate macros" which uses estimated TDEE + protein target (2.2g/kg lean mass) to fill in suggested values before the user saves.

---

## ADR-005: Recents & Favorites — Derived from `food_entries`, Flag on `custom_foods`

**Decision:**
- **Recents:** `GET /api/food/recents` — query last 20 distinct `description` values from `food_entries` for the user, ordered by `MAX(captured_at) DESC`. No new table needed.
- **Favorites:** Add `is_favourite INTEGER DEFAULT 0` column to `custom_foods`. Users can mark any custom food as a favorite. Add `PATCH /api/custom-foods/:id` for toggle.
- **UI:** Show recents + favorites in a combined quick-pick list at the top of the text-log sheet, before the user types.

---

## ADR-006: Voice Logging — Web Speech API, Client-Side Only

**Decision:** Use `window.SpeechRecognition` (Web Speech API) client-side. No server changes needed. The transcribed text string is passed to the existing `POST /api/food/text-log` endpoint.

**Why no Whisper/server-side STT?**
- Web Speech API is free, fast, and works on mobile Chrome/Safari.
- Avoids adding a Whisper API cost and latency.
- The existing Claude text-log endpoint already handles messy natural language.

**Fallback:** If `SpeechRecognition` is unavailable (Firefox desktop), show a message and fall back to the text input.

---

## ADR-007: Copy-Meal / Copy-Day

**Decision:** `POST /api/food/copy-day` with body `{ from: "YYYY-MM-DD", to: "YYYY-MM-DD" }`. Server duplicates all `food_entries` rows for `from` date, sets `captured_at` to today, clears `image_ref`, sets `user_adjusted = 0`.

**UI:** "Copy Yesterday" button in the Log page header (visible when today's food log is empty or has fewer than 2 entries).

---

## ADR-008: Settings Page — New Route `/settings`

**Decision:** Add a `/settings` page and bottom-nav icon (replacing or adding to current 4-tab layout). Settings will consolidate:
- Water goal (ml)
- EWMA alpha for weight smoothing
- Macro targets editor
- Profile (height, sex, birth date) — feeds `mifflinBmr` in `projection.ts`
- Data export (link to `GET /api/export`)
- Garmin connection status

**Why now?** Multiple Phase 2 features (adaptive TDEE, configurable water goal, EWMA alpha) need user-editable parameters. A Settings page is the right home rather than burying controls in existing pages.

---

## Phase 2 Implementation Order (Recommended)

| Priority | Feature | Effort | ADR |
|---|---|---|---|
| 1 | Food DB search (Open Food Facts) | M | ADR-001 |
| 2 | Barcode scanning | M | ADR-002 |
| 3 | Recents & favorites | S | ADR-005 |
| 4 | Macro goals UI + `macro_targets` table | M | ADR-004 |
| 5 | Voice logging | S | ADR-006 |
| 6 | Copy-day | S | ADR-007 |
| 7 | Settings page | M | ADR-008 |
| 8 | Adaptive TDEE | L | ADR-003 |
| 9 | Micronutrients (after food DB) | L | ADR-001 ext. |
| 10 | Reminders / streaks | M | — |
