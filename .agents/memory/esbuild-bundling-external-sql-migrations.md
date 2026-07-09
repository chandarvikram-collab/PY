---
name: esbuild bundling breaks package-relative migration file lookups
description: A dependency that resolves its own SQL/asset files via __dirname will silently fail after esbuild bundling unless externalized.
---

Some npm packages (e.g. `stripe-replit-sync`) locate bundled non-JS files (SQL migrations, templates) at runtime via `__dirname` relative to their own package location. When such a package is bundled into a single esbuild output instead of staying in `node_modules`, `__dirname` no longer points at the package directory, so the file lookup silently no-ops (no thrown error) instead of failing loudly.

**Why:** Found when a Stripe schema migration silently never ran after esbuild bundled the API server — no error was logged, just missing tables.

**How to apply:** If a dependency ships and reads non-code assets at runtime (docs usually mention "migrations" or "templates" dirs), add it to the esbuild `external` array so it's resolved from `node_modules` at runtime rather than bundled. Suspect this class of bug whenever a package's documented file-based behavior silently no-ops only after bundling/build, but works in dev.
