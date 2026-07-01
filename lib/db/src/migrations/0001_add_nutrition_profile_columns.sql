-- Migration: Add nutrition and onboarding profile columns to users table
-- Created as part of Task #48 (Calorie & Macro Calculator with Onboarding)

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS carb_goal INTEGER,
  ADD COLUMN IF NOT EXISTS fat_goal INTEGER,
  ADD COLUMN IF NOT EXISTS biological_sex TEXT,
  ADD COLUMN IF NOT EXISTS height_cm INTEGER,
  ADD COLUMN IF NOT EXISTS weight_kg INTEGER,
  ADD COLUMN IF NOT EXISTS activity_level TEXT,
  ADD COLUMN IF NOT EXISTS weekly_pace_lbs INTEGER,
  ADD COLUMN IF NOT EXISTS primary_goal TEXT,
  ADD COLUMN IF NOT EXISTS age INTEGER;