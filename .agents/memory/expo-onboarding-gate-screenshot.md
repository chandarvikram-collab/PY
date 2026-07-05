---
name: Expo onboarding gate blocks fresh-session screenshot testing
description: Why direct-navigating to a deep route in the mobile app screenshot tool can unexpectedly show the onboarding flow instead of the target screen.
---

The root layout has a global `OnboardingGate` effect that redirects to `/onboarding` ~600ms after mount whenever the hydrated `userProfile` has an id but no `biologicalSex`. It runs regardless of which route is loaded.

**Why:** The `screenshot` tool's `app_preview` opens a fresh browser context with no persisted AsyncStorage/session, so every deep-link navigation re-triggers this race: default state loads first, then hydration overwrites it, and if the effective profile still lacks `biologicalSex` the gate fires and stomps whatever screen was requested (independent of any code changes being verified).

**How to apply:** When a screenshot of a non-home tab unexpectedly shows the onboarding form, this is very likely the pre-existing gate racing with hydration in a fresh session — not a bug in the feature you just touched. Cross-check via typecheck, workflow logs, and direct API curl calls instead of relying solely on screenshot navigation for deep routes in this app.
