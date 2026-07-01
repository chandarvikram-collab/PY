-- Add type discriminator columns to session tables
-- Lift workouts default to 'lift', run workouts to 'run'

ALTER TABLE "workout_sessions"
  ADD COLUMN IF NOT EXISTS "type" text NOT NULL DEFAULT 'lift';

ALTER TABLE "run_sessions"
  ADD COLUMN IF NOT EXISTS "type" text NOT NULL DEFAULT 'run';
