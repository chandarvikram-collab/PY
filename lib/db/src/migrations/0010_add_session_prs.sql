CREATE TABLE "session_prs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_id" uuid NOT NULL REFERENCES "workout_sessions"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "exercise_name" text NOT NULL,
  "weight_lbs" real NOT NULL,
  "reps" integer NOT NULL,
  "estimated_1rm" real NOT NULL,
  "date" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
