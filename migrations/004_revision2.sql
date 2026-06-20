-- Revision Prompt #2: configurable water goal + macro targets on profiles.
-- These are also applied at runtime via idempotent ALTER TABLE ... in
-- functions/api/water.ts, functions/api/profile.ts and functions/api/dashboard.ts
-- (D1 lacks "ADD COLUMN IF NOT EXISTS", so the runtime code wraps each ALTER
--  in a try/catch). This file documents the intended schema for fresh DBs.

ALTER TABLE profiles ADD COLUMN water_goal_ml INTEGER DEFAULT 2500;
ALTER TABLE profiles ADD COLUMN target_kcal INTEGER;
ALTER TABLE profiles ADD COLUMN target_protein_g INTEGER;
ALTER TABLE profiles ADD COLUMN target_carbs_g INTEGER;
ALTER TABLE profiles ADD COLUMN target_fat_g INTEGER;
