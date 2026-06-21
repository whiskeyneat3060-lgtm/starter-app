-- Add unique constraint on burn_entries(user_id, date) so that
-- ON CONFLICT(user_id, date) DO UPDATE works correctly in the Garmin ingest endpoint.
CREATE UNIQUE INDEX IF NOT EXISTS uq_burn_entries_user_date ON burn_entries(user_id, date);
