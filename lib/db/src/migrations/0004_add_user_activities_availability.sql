-- Migration: Add activities and availability columns to users table
-- Created as part of Task #1 (Social fitness matching: Discover filtering by
-- activity type and availability)

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS activities TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS availability TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
