---
name: GitHub push authentication
description: Environment-specific behavior when pushing a Repl workspace to GitHub
---

An authorized GitHub integration can be attached to the environment while shell-based `git push` still receives GitHub's invalid username or token response. The connector may withhold credentials from the shell credential helper even though the repository remote is configured correctly; a newly accepted OAuth connection may not reach the runtime immediately.

**Why:** Repeated pushes to configured GitHub remotes failed at GitHub authentication while the integration status reported as attached and the connector credential lookup returned no usable connection, including immediately after a fresh OAuth grant.

**How to apply:** Do not ask for or paste a personal access token in chat. Have the user reauthorize GitHub through Replit's Git panel or Integrations flow, refresh or reopen the workspace if the credential has not propagated, and retry the normal push. If it remains unavailable, the user can use the Git pane to push directly.