---
name: GitHub push authentication
description: Environment-specific behavior when pushing a Repl workspace to GitHub
---

An authorized GitHub integration can be attached to the environment while shell-based `git push` still receives GitHub's invalid username or token response. The connector may withhold credentials from the shell credential helper even though the repository remote is configured correctly; a newly accepted OAuth connection may not reach the runtime immediately.

**Why:** Repeated pushes to configured GitHub remotes failed at GitHub authentication while the integration status reported as attached and the connector credential lookup returned no usable connection, including immediately after a fresh OAuth grant.

**How to apply:** Do not ask for or paste a personal access token in chat. Have the user sign in through the GitHub CLI's browser flow and configure its Git credential helper. When Replit's default askpass continues to override it, invoke the push with `GIT_ASKPASS` unset so Git uses the CLI helper. Preserve any pre-existing remote history with a normal fetch-and-merge; do not force-push.