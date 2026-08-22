---
name: GitHub push authentication
description: Environment-specific behavior when pushing a Repl workspace to GitHub
---

An authorized GitHub integration can be attached to the environment while shell-based `git push` still receives GitHub's invalid username or token response. The connector may withhold credentials from the shell credential helper even though the repository remote is configured correctly.

**Why:** Repeated pushes to configured GitHub remotes failed at GitHub authentication while the integration status reported as attached and the connector credential lookup returned no usable connection.

**How to apply:** Do not ask for or paste a personal access token in chat. Have the user reauthorize GitHub through Replit's Git panel or Integrations flow, then retry the normal push.