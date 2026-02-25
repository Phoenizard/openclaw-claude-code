# openclaw-claude-code

一个 [OpenClaw](https://github.com/openclaw/openclaw) 插件，将 Claude Code 集成到你的消息工作流中。通过 Slack（或任何 OpenClaw 支持的渠道）控制本机的 Claude Code 来分析、规划和执行编码任务。

## 功能

- **`claude_plan`** — 只读分析模式。分析代码库、审查架构、制定实现方案。不会修改任何文件。
- **`claude_exec`** — 执行模式。实现功能、修复 bug、重构代码。在白名单目录内拥有完整权限。
- **`claude_teams`** — 多 Agent 模式。多个 Claude Code Agent 并行协作，内置文件锁和协调机制。

## 安全模型

所有安全约束在**代码层面强制执行**，LLM 无法绕过。

| 层级 | 控制内容 | 默认值 |
|------|---------|-------|
| `allowedPaths` | Claude Code 允许操作的目录 | `[]`（全部拒绝，必须显式配置） |
| `maxTimeoutSecs` | 任务时长硬上限 | `600`（10 分钟） |
| `maxConcurrent` | 最大并发 Claude Code 进程数 | `2` |
| 路径校验 | 解析 `~`，阻止 `../../` 穿越 | 始终开启 |

### 权限模式

| 工具 | Claude Code 模式 | 行为 |
|------|-----------------|------|
| `claude_plan` | `plan` | 只读。不能创建、编辑或删除文件。 |
| `claude_exec` | `bypassPermissions` | 在 `allowedPaths` 目录内拥有完整写入权限。 |
| `claude_teams` | `bypassPermissions` | 同 exec，附加多 Agent 协调。 |

## 前置条件

- [OpenClaw](https://github.com/openclaw/openclaw) 已安装并运行
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) 已安装（`claude --version` 确认）
- Node.js 22+

## 安装

```bash
git clone https://github.com/Phoenizard/openclaw-claude-code.git
cd openclaw-claude-code
npm install
openclaw plugins install -l .
openclaw gateway restart
```

验证：

```bash
openclaw plugins list
# 应显示：claude-code: loaded
```

## 配置

编辑 `~/.openclaw/openclaw.json`：

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
          "claudeOauthToken": "你的token"
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

### 认证

Claude Code 需要认证才能调用 Anthropic API。Gateway 作为系统服务运行时不会继承你的 shell 环境变量，因此需要在插件 config 中设置 `claudeOauthToken`，或通过 `CLAUDE_BIN` 环境变量指向已认证的 Claude Code 二进制。

### Claude 二进制查找顺序

插件按以下顺序查找 `claude` 二进制：

1. `$CLAUDE_BIN` 环境变量
2. `~/bin/claude`（推荐——复制到此处避免路径空格问题）
3. `~/Library/Application Support/Claude/claude-code/<最新版本>/claude`
4. PATH 中的 `claude`

> **macOS 注意：** Claude Desktop 的安装路径包含空格（`Application Support`）。Node.js 的 `spawn()` 可能因此报 ENOENT 错误。建议将二进制复制到 `~/bin/claude` 来规避。

## 使用方法

在 Slack 中给你的 OpenClaw bot 发消息：

### 分析（只读）

```
用 claude_plan 分析 ~/projects/my-app 的项目架构
```

### 执行任务

```
用 claude_exec 在 ~/projects/my-app/src/api.ts 中添加错误处理
```

### 多 Agent 协作

```
用 claude_teams 在 ~/projects/my-app 中并行开发：前端团队实现登录页，后端团队实现认证 API
```

### Plan → 审核 → Exec 两阶段工作流（推荐）

1. **Plan：** 让 `claude_plan` 制定实现方案
2. **审核：** 在 Slack 中阅读方案，必要时要求修改
3. **执行：** 让 `claude_exec` 实现审核通过的方案

## 工具速查

| 工具 | 模式 | 默认超时 | 适用场景 |
|------|------|---------|---------|
| `claude_plan` | `plan`（只读） | 300s | 架构分析、代码审查、方案规划 |
| `claude_exec` | `bypassPermissions` | 300s | 功能实现、修 bug、重构 |
| `claude_teams` | `bypassPermissions` | 600s | 并行开发（前端 + 后端 + 测试） |

所有工具接受以下参数：
- `task`（必填）— 任务描述
- `workdir`（可选）— 工作目录（必须在 `allowedPaths` 内）
- `timeout`（可选）— 超时秒数（受 `maxTimeoutSecs` 限制）

## 许可证

MIT
