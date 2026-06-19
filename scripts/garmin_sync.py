#!/usr/bin/env python3
"""
Garmin Connect sync script for Recomp OS.
Fetches last 7 days of activity/burn data from Garmin Connect
and POSTs to the Recomp OS ingest endpoint.

Required env vars:
  GARMIN_EMAIL         - Garmin Connect email
  GARMIN_PASSWORD      - Garmin Connect password
  INGEST_ENDPOINT      - Full URL to POST, e.g. https://recomp-os.pages.dev/api/ingest/garmin
  INGEST_SHARED_SECRET - Matches INGEST_SHARED_SECRET in Cloudflare env
"""

import os
import sys
import json
import requests
from datetime import date, timedelta
from garminconnect import Garmin

DAYS_BACK = 7


def main():
    email = os.environ.get("GARMIN_EMAIL", "")
    password = os.environ.get("GARMIN_PASSWORD", "")
    endpoint = os.environ.get("INGEST_ENDPOINT", "")
    secret = os.environ.get("INGEST_SHARED_SECRET", "")

    if not all([email, password, endpoint, secret]):
        print("ERROR: Missing required environment variables", file=sys.stderr)
        sys.exit(1)

    print("Authenticating with Garmin Connect...")
    api = Garmin(email, password)
    api.login()
    print("Logged in successfully.")

    days = []
    today = date.today()
    for i in range(DAYS_BACK):
        d = today - timedelta(days=i)
        date_str = d.isoformat()
        print(f"Fetching {date_str}...")

        try:
            # Fetch user summary (steps, calories)
            summary = api.get_user_summary(date_str)
            total_kcal = summary.get("totalKilocalories", 0) or 0
            active_kcal = summary.get("activeKilocalories", 0) or 0
            resting_kcal = summary.get("bmrKilocalories", 0) or 0
            steps = summary.get("totalSteps", 0) or 0
        except Exception as e:
            print(f"  Warning: could not fetch summary for {date_str}: {e}", file=sys.stderr)
            continue

        try:
            # Fetch resting HR
            hr_data = api.get_resting_heart_rate(date_str)
            resting_hr = hr_data.get("restingHeartRate") if hr_data else None
        except Exception:
            resting_hr = None

        days.append({
            "date": date_str,
            "total_kcal": round(float(total_kcal)),
            "active_kcal": round(float(active_kcal)),
            "resting_kcal": round(float(resting_kcal)),
            "steps": int(steps),
            "resting_hr": int(resting_hr) if resting_hr else None,
        })

    if not days:
        print("No data to sync.")
        return

    print(f"Syncing {len(days)} days to {endpoint}...")
    resp = requests.post(
        endpoint,
        json=days,
        headers={
            "Content-Type": "application/json",
            "X-Ingest-Secret": secret,
        },
        timeout=30,
    )

    if resp.ok:
        result = resp.json()
        print(f"Sync successful: {json.dumps(result)}")
    else:
        print(f"ERROR: Ingest failed with status {resp.status_code}: {resp.text}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
