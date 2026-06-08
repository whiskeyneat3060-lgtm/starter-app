# Streak — Habit Streak Tracker

A beautiful, offline-first habit tracker. Dark mode, timer-gated completions, reward goals, and a per-activity calendar. All data lives in IndexedDB — no backend, no account.

## Run locally

```bash
npm install
npm run dev
```

Then open http://localhost:5173 in your browser (or on your phone via local network with `npm run host`).

## Stack

- **Vite + React + TypeScript** — build tooling
- **Tailwind CSS v4** — styling (dark mode by default)
- **Framer Motion** — animations
- **Dexie** — IndexedDB wrapper (all data is local)
- **date-fns** — date math

## How it works

- **Create an activity** via the **+** button: set a name, session duration, frequency (daily / every other day / specific weekdays), a start time, and a reward goal.
- **Tap "Start session"** to open the full-screen timer. The timer must run to completion for the day to count toward your streak. Pausing is fine; cancelling early logs partial minutes but doesn't count.
- **Streak logic**: scheduled days that are completed increment the streak. Non-scheduled days are neutral. Missed scheduled days (in the past) break the streak.
- **Reward**: when your current streak reaches the target, a celebration fires and your reward is highlighted.
- **Calendar**: tap any activity card to see its monthly calendar — amber = done, red = missed, outlined = today.

---

## FUTURE / NOT NOW

The following were deliberately left out of this version:

- **Cloudflare deployment** — the app is entirely local (IndexedDB). Adding Cloudflare Pages hosting is straightforward (`npm run build` → deploy `dist/`), but sync/auth was out of scope.
- **Friend notifications via Telegram** — accountability features (send a message to a Telegram bot when a streak is updated) are planned but not built. Would require a small serverless function and Telegram Bot API.
