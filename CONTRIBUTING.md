# Contributing to openclaw-claude-code

Thanks for your interest in contributing!

## Getting Started

```bash
git clone https://github.com/Phoenizard/openclaw-claude-code.git
cd openclaw-claude-code
npm install
```

## Development

The plugin is written in TypeScript and loaded directly by OpenClaw (no build step needed).

```
src/
├── shared.ts        # Core logic: path validation, spawn, concurrency, logging
├── plan-tool.ts     # claude_plan (read-only mode)
├── exec-tool.ts     # claude_exec (full-permission mode)
└── teams-tool.ts    # claude_teams (multi-agent mode)
```

### Running Tests

```bash
npm test
```

### Local Testing

```bash
openclaw plugins install -l .
openclaw gateway restart
```

Then send a message to your bot in Slack to verify the tools work.

## Pull Requests

1. Fork the repo and create a feature branch
2. Make your changes
3. Add tests if applicable
4. Run `npm test` to ensure all tests pass
5. Submit a PR with a clear description of the change

## Reporting Issues

Open an issue on GitHub with:
- What you expected to happen
- What actually happened
- Steps to reproduce
- Your environment (OS, Node.js version, Claude Code version)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
