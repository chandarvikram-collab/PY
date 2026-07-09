---
name: Replit Stripe connector field name
description: The Replit-managed Stripe connection secret field is `settings.secret`, not `settings.secret_key`.
---

The Replit Stripe integration connection object exposes the API key at `settings.secret`. The stripe skill's code templates (as of 2026-07) reference `settings.secret_key`, which is stale and causes silent auth failures / wrong-key usage.

**Why:** Found by tracing a live bug where checkout/webhook calls used an undefined key because the skill template's field name didn't match the actual connector schema.

**How to apply:** When wiring a Replit-managed Stripe connection, read `settings.secret` from the connection object (verify via `listConnections('stripe')` output at runtime), not `settings.secret_key`. If the skill doc still says `secret_key`, trust the live connection object over the doc.
