---
name: Mobile sign-out cleanup
description: Sign-out must clear local AsyncStorage session/cache keys, not just call the auth provider's raw signOut
---

Calling the auth provider's bare `signOut()` (e.g. Clerk's) only ends the remote session. It does not clear locally cached app state (profile/workout cache, pending sync queue, linked-user-id markers, first-login-init markers) held in AsyncStorage and in-memory context state.

**Why:** Without an explicit local cleanup step, the next account signed in on the same device can briefly see the previous user's cached profile/data, and stale "already linked" markers can suppress logic that should re-run for the new account.

**How to apply:** Route all sign-out actions through a single app-level handler (not the raw auth-provider hook) that: resets in-memory state to defaults, clears every AsyncStorage key used for local session/user caching and linkage markers, resets any user-id refs, and only then calls the auth provider's `signOut()`. Wire every "Sign Out" / "Log Out" UI entry point to this one handler so cleanup can't be bypassed by adding a new entry point later.
