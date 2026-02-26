# Changelog

## [0.1.0] - 2026-02-26

### Added
- `claude_plan` — Read-only analysis mode using Claude Code's `plan` permission
- `claude_exec` — Full-permission execution mode using `bypassPermissions`
- `claude_teams` — Multi-agent parallel collaboration mode
- Code-enforced security policy: `allowedPaths`, `maxTimeoutSecs`, `maxConcurrent`
- OAuth token support via `claudeOauthToken` config
- Real-time log file output to `/tmp/claude-logs/` for monitoring with `tail -f`
- Smart Claude binary resolution (env var → `~/bin/claude` → Application Support → PATH)
