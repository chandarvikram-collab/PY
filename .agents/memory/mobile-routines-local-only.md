---
name: Mobile routines are local-only
description: IronPace mobile routines created by the user are not synced to the server routines table; only AI-generated routines get POSTed server-side.
---

`addRoutine` in the mobile `AppContext` only updates local/AsyncStorage state. The only path that POSTs to `/api/routines` server-side is the AI-plan flow when the user saves an AI-generated routine. This means user-created routine IDs on the client generally do not exist in the server `routines` table.

**Why:** the app was built incrementally and routine persistence was never fully wired up beyond the AI-plan flow; discovered while wiring the workout-schedule feature, which needed to snapshot exercises for a scheduled workout.

**How to apply:** any server feature that references a client-side `routineId` (e.g. scheduling, sharing) must not assume the ID resolves in the server DB. Have the client snapshot/send the exercise data itself in the request body rather than having the server re-derive it from `routineId`.
