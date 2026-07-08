ALTER TABLE "session_prs"
  ADD COLUMN "exercise_index" integer NOT NULL DEFAULT 0,
  ADD COLUMN "set_index" integer NOT NULL DEFAULT 0;
