CREATE TABLE "personal_records" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "exercise_name" text NOT NULL,
  "weight_lbs" real NOT NULL,
  "reps" integer NOT NULL,
  "estimated_1rm" real NOT NULL,
  "date" text NOT NULL,
  "session_id" uuid REFERENCES "workout_sessions"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE ("user_id", "exercise_name")
);
