---
name: GitHub push authentication
description: Environment-specific behavior when pushing a Repl workspace to GitHub
---

An authorized GitHub integration can be attached to the environment while shell-based `git push` still receives GitHub's invalid username or token response. The connector may withhold credentials from the shell credential helper even though the repository remote is configured correctly; a newly accepted OAuth connection may not reach the runtime immediately.

**Why:** Repeated pushes to configured GitHub remotes failed at GitHub authentication while the integration status reported as attached, including immediately after a fresh OAuth grant. The same connection still worked through the authenticated GitHub API proxy.

**How to apply:** Do not ask for or paste a personal access token in chat. Try the configured remote once, then repair OAuth once if GitHub explicitly rejects its credential. If shell Git still fails, use the authenticated GitHub API proxy as a non-force fallback: confirm the remote branch has not moved, serialize writes, and verify remote file bytes against the local tree. Be transparent that API-created commit SHAs differ from local Git history.