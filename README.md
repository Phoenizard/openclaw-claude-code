# openclaw-claude-code

An [OpenClaw](https://github.com/openclaw/openclaw) plugin that integrates Claude Code into your messaging workflow. Control Claude Code from Slack (or any OpenClaw-supported channel) to analyze, plan, and execute coding tasks on your local machine.

## Features

- **`claude_plan`** — Read-only analysis mode. Analyze codebases, review architecture, plan implementations. No files are modified.
- **`claude_exec`** — Execution mode. Implement features, fix bugs, refactor code. Operates with full permissions within whitelisted directories.
- **`claude_teams`** — Multi-agent mode. Multiple Claude Code agents collaborate in parallel with built-in file locking and coordination.

## Security Model

All security constraints are **enforced in code** — the LLM cannot bypass them.

| Layer | What it controls | Default |
|-------|-----------------|---------|
| `allowedPaths` | Directories where Claude Code can operate | `[]` (deny all — must configure explicitly) |
| `maxTimeoutSecs` | Hard cap on task duration | `600` (10 min) |
| `maxConcurrent` | Max simultaneous Claude Code processes | `2` |
| Path validation | Resolves `~` and blocks `../../` traversal | Always on |

### Permission Modes

| Tool | Claude Code mode | Behavior |
|------|-----------------|----------|
| `claude_plan` | `plan` | Read-only. Cannot create, edit, or delete files. |
| `claude_exec` | `bypassPermissions` | Full write access within `allowedPaths` directories only. |
| `claude_teams` | `bypassPermissions` | Same as exec, with multi-agent coordination. |

## Prerequisites

- [OpenClaw](https://github.com/openclaw/openclaw) installed and running
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed locally (`claude --version`)
- Node.js 22+

## Installation

```bash
git clone https://github.com/Phoenizard/openclaw-claude-code.git
cd openclaw-claude-code
npm install
openclaw plugins install -l .
openclaw gateway restart
```

Verify:

```bash
openclaw plugins list
# Should show: claude-code: loaded
```

## Configuration

Edit `~/.openclaw/openclaw.json`:

```jsonc
{
  "plugins": {
    "entries": {
      "claude-code": {
        "enabled": true,
        "config": {
          "allowedPaths": ["~/projects/my-app", "~/projects/another-app"],
          "maxTimeoutSecs": 600,
          "maxConcurrent": 2,
          "claudeOauthToken": "your-token-here"
        }
      }
    }
  },
  "agents": {
    "list": [
      {
        "id": "main",
        "default": true,
        "tools": {
          "allow": ["claude_plan", "claude_exec", "claude_teams"]
        }
      }
    ]
  }
}
```

### Authentication

Claude Code needs authentication to call the Anthropic API. Since the Gateway runs as a system service (launchd/systemd), it doesn't inherit your shell environment. Set `claudeOauthToken` in the plugin config, or set `CLAUDE_BIN` to point to a pre-authenticated Claude Code binary.

### Claude Binary Resolution

The plugin searches for the `claude` binary in this order:

1. `$CLAUDE_BIN` environment variable
2. `~/bin/claude` (recommended — create a copy here to avoid spaces in path)
3. `~/Library/Application Support/Claude/claude-code/<latest>/claude`
4. `claude` on PATH

> **macOS note:** The Claude Desktop install path contains a space (`Application Support`). Node.js `spawn()` may fail with ENOENT. Copy the binary to `~/bin/claude` to avoid this issue.

## Usage

Send messages to your OpenClaw bot in Slack:

### Analyze (read-only)

```
Use claude_plan to analyze ~/projects/my-app architecture
```

### Execute a task

```
Use claude_exec to add error handling to ~/projects/my-app/src/api.ts
```

### Multi-agent collaboration

```
Use claude_teams in ~/projects/my-app: Frontend team builds the login page. Backend team implements the auth API.
```

### Plan-then-Execute workflow (recommended)

1. **Plan:** Ask `claude_plan` to create an implementation plan
2. **Review:** Read the plan in Slack, request changes if needed
3. **Execute:** Ask `claude_exec` to implement the approved plan

## Tool Reference

| Tool | Mode | Default Timeout | Use Case |
|------|------|----------------|----------|
| `claude_plan` | `plan` (read-only) | 300s | Architecture analysis, code review, planning |
| `claude_exec` | `bypassPermissions` | 300s | Feature implementation, bug fixes, refactoring |
| `claude_teams` | `bypassPermissions` | 600s | Parallel development (frontend + backend + tests) |

All tools accept:
- `task` (required) — Task description
- `workdir` (optional) — Working directory (must be in `allowedPaths`)
- `timeout` (optional) — Timeout in seconds (clamped to `maxTimeoutSecs`)

## License

MIT
