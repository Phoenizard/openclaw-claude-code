# 快速上手：通过 Slack 控制 Claude Code

从零开始，通过 Slack 向 OpenClaw 机器人发消息来调用 Claude Code。

---

## 前置条件

- macOS 或 Linux
- Node.js 22+（`node --version` 确认）
- Claude Code 已安装并可用（`claude --version` 确认）
- 一个 Slack 工作区（你有权限创建 App）

---

## 第一步：安装 OpenClaw

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

或通过 npm：

```bash
npm install -g openclaw@latest
```

安装完成后运行引导向导：

```bash
openclaw onboard --install-daemon
```

这会：
1. 创建配置文件 `~/.openclaw/openclaw.json`
2. 配置模型 provider（选择 Anthropic，使用 OAuth 或 API Key）
3. 将 Gateway 安装为系统服务（launchd/systemd）

验证安装：

```bash
openclaw gateway status
```

---

## 第二步：创建 Slack App

### 2.1 创建应用

1. 打开 https://api.slack.com/apps
2. 点击 **Create New App** → **From scratch**
3. 输入名称（如 `OpenClaw Bot`），选择你的工作区

### 2.2 启用 Socket Mode

1. 左侧菜单 → **Socket Mode** → 开启
2. 创建 **App-Level Token**，名称随意，scope 选 `connections:write`
3. 复制生成的 `xapp-...` token

### 2.3 配置 Bot Token Scopes

左侧 → **OAuth & Permissions** → **Bot Token Scopes**，添加：

```
chat:write
channels:history
channels:read
groups:history
im:history
mpim:history
users:read
app_mentions:read
reactions:read
reactions:write
files:read
files:write
```

### 2.4 订阅事件

左侧 → **Event Subscriptions** → 开启 → **Subscribe to bot events**，添加：

```
app_mention
message.channels
message.groups
message.im
message.mpim
```

### 2.5 启用 App Home

左侧 → **App Home** → 勾选 **Allow users to send Slash commands and messages from the messages tab**

### 2.6 安装到工作区

左侧 → **Install App** → 安装并复制 **Bot User OAuth Token**（`xoxb-...`）

---

## 第三步：配置 OpenClaw 连接 Slack

编辑 `~/.openclaw/openclaw.json`：

```jsonc
{
  "channels": {
    "slack": {
      "enabled": true,
      "mode": "socket",
      "appToken": "xapp-你的app-token",
      "botToken": "xoxb-你的bot-token"
    }
  }
}
```

重启 Gateway 使配置生效：

```bash
openclaw gateway restart
```

验证 Slack 连接：

```bash
openclaw channels status --probe
```

此时你应该能在 Slack 中给 bot 发消息并收到回复了。

---

## 第四步：安装 Claude Code 插件

### 4.1 下载插件

```bash
cd ~/Workplace
git clone <你的插件仓库> openclaw-claude-code
# 或者如果已经存在：
cd ~/Workplace/openclaw-claude-code
```

### 4.2 安装依赖

```bash
cd ~/Workplace/openclaw-claude-code
npm install
```

### 4.3 以 link 模式注册到 OpenClaw

```bash
openclaw plugins install -l ~/Workplace/openclaw-claude-code
```

确认插件已加载：

```bash
openclaw plugins list
# 应看到 claude-code: loaded
```

---

## 第五步：配置 Agent 允许使用 Claude Code 工具

编辑 `~/.openclaw/openclaw.json`，添加 agent 和工具权限：

```jsonc
{
  "agents": {
    "list": [
      {
        "id": "main",
        "default": true,
        "tools": {
          "allow": ["claude_plan", "claude_exec", "claude_teams"]
        }
      }
    ],
    "defaults": {
      "workspace": "~/.openclaw/workspace"
    }
  },
  "approvals": {
    "exec": {
      "allowlist": [
        { "pattern": "claude" }
      ]
    }
  },
  "channels": {
    "slack": {
      "enabled": true,
      "mode": "socket",
      "appToken": "xapp-你的app-token",
      "botToken": "xoxb-你的bot-token"
    }
  }
}
```

重启 Gateway：

```bash
openclaw gateway restart
```

---

## 第六步：在 Slack 中测试

打开 Slack，给你的 bot 发消息：

### 测试 1：代码分析（只读）

```
用 claude_plan 分析 ~/my-project 的项目架构
```

bot 会调用 `claude --permission-mode plan --print <task>` 来分析代码，不会做任何修改。

### 测试 2：执行任务

```
用 claude_exec 在 ~/my-project 中给 README 添加安装说明
```

bot 会调用 `claude --print <task>` 来执行编码任务（可以读写文件、运行命令）。

### 测试 3：多 agent 协作

```
用 claude_teams 在 ~/my-project 中并行开发：前端团队实现登录页，后端团队实现认证 API
```

bot 会启用 `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` 让多个 Claude Code agent 并行工作。

---

## 故障排查

### 插件没加载

```bash
openclaw plugins list          # 检查状态
openclaw plugins doctor        # 诊断加载问题
```

### Slack 连不上

```bash
openclaw channels status --probe
```

检查 token 是否正确，Socket Mode 是否启用。

### Claude Code 执行失败

确保 `claude` 命令在 Gateway 运行的环境中可用：

```bash
which claude
claude --version
```

如果 Gateway 作为系统服务运行，PATH 可能不包含 claude 所在目录。可以在 `shared.ts` 的 `resolveClaudeBin()` 中硬编码路径。

### 查看 Gateway 日志

```bash
# macOS
tail -f /tmp/openclaw-gateway.log

# 或
openclaw gateway logs
```

---

## 三个工具速查

| 工具 | 用途 | Claude CLI 参数 |
|------|------|----------------|
| `claude_plan` | 只读分析、代码审查、架构规划 | `claude --permission-mode plan --print <task>` |
| `claude_exec` | 编码执行、修 bug、重构 | `claude --print <task>` |
| `claude_teams` | 多 agent 并行开发 | `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 claude --print <task>` |

每个工具都支持以下参数：
- `task`（必填）— 任务描述
- `workdir`（可选）— 工作目录
- `timeout`（可选）— 超时秒数（plan/exec 默认 300s，teams 默认 600s）
