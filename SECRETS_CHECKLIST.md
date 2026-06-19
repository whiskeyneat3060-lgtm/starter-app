# Secrets Checklist — Recomp OS

## Cloudflare Pages Environment Variables

Set these in the Cloudflare Pages dashboard under **Settings → Environment variables**:

| Variable | Description | Required |
|---|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API key for food/InBody AI analysis | Optional (falls back to mock) |
| `APP_PIN` | 4-digit PIN for app access | **Required** (default: 1234) |
| `INGEST_SHARED_SECRET` | Secret header value for Garmin ingest endpoint | Required if using Garmin sync |
| `CLAUDE_MODEL` | Anthropic model to use | Optional (default: claude-opus-4-8) |

## GitHub Repository Secrets

Set these in **Settings → Secrets and variables → Actions**:

| Secret | Description |
|---|---|
| `GARMIN_EMAIL` | Garmin Connect account email |
| `GARMIN_PASSWORD` | Garmin Connect account password |
| `INGEST_ENDPOINT` | Full URL to POST, e.g. `https://recomp-os.pages.dev/api/ingest/garmin` |
| `INGEST_SHARED_SECRET` | Must match the Cloudflare env var of same name |

## Cloudflare D1 Setup

After deploying, run these commands to initialize the database:

```bash
# 1. Create the D1 database and note the database_id
wrangler d1 create recomp-os

# 2. Update wrangler.toml with the real database_id

# 3. Apply schema migration
wrangler d1 execute recomp-os --file=migrations/001_schema.sql

# 4. Apply seed data (optional, for demo/dev)
wrangler d1 execute recomp-os --file=migrations/002_seed.sql
```

## Local Development

Copy `.dev.vars.example` to `.dev.vars` and fill in values:
```bash
cp .dev.vars.example .dev.vars
# Edit .dev.vars with your values
```

`.dev.vars` is gitignored and will never be committed.
