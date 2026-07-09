---
name: drizzle-kit push TTY prompt blocks non-interactive runs
description: pnpm --filter @workspace/db run push can hang/fail non-interactively due to an existing constraint prompt; use direct SQL as a fallback.
---

`pnpm --filter @workspace/db run push` (drizzle-kit push) can get stuck prompting to confirm/rename an existing constraint (seen with `users_clerk_id_unique`) because drizzle-kit expects an interactive TTY to answer the prompt. In this sandboxed/non-interactive environment that prompt cannot be answered, so the push command fails or hangs even though the actual schema change is unrelated to that constraint.

**Why:** drizzle-kit's interactive disambiguation step for renamed/existing constraints requires stdin input that isn't available when the command is run by an agent.

**How to apply:** If `db run push` fails on an unrelated pre-existing constraint prompt, don't keep retrying it — apply the new table/column DDL directly via `executeSql()` (see the `database` skill) as a working fallback, matching the Drizzle schema definition exactly (types, defaults, FKs, indexes).
