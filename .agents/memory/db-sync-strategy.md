---
name: IronPace DB sync strategy
description: How the mobile app syncs with PostgreSQL — offline-first with background API calls
---

## Rule
AppContext keeps AsyncStorage as the primary offline store. All API calls are fire-and-forget (never await in state updates). On startup, hydrate from API and merge with local state by ID.

**Why:** React Native offline-first requirement. Users must never see loading spinners for their own data. API sync is a bonus, not a blocker.

**How to apply:**
- New data mutations: update local state first, then call `apiPost`/`apiPatch`/`apiDelete` with `.catch(() => {})`.
- New data types: add a table, add a route, add a hydration fetch in `hydrateFromApi()`, add an ID-based merge.
- Device userId: stored in AsyncStorage under `ironpace_api_user_id`, never in userProfile.id (which stays "me" for local challenge/chat logic).
- Volume: stored in DB as kg (multiply lbs × 0.453592 on write, divide on read).
- Leaderboard upgrades from SEED_FRIENDS to real data only when ≥2 other real users exist in DB.
