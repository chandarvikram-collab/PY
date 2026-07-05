-- Migration: Add imperial measurement columns and convert weekly pace to real
-- Created as part of imperial onboarding update

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS height_ft INTEGER,
  ADD COLUMN IF NOT EXISTS height_in INTEGER,
  ADD COLUMN IF NOT EXISTS weight_lbs INTEGER;

-- Convert weekly_pace_lbs from integer to real to support .25/.5 increments
ALTER TABLE users
  ALTER COLUMN weekly_pace_lbs TYPE REAL;
