import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { setSecurityPolicy } from "./src/shared.js";
import { createClaudePlanTool } from "./src/plan-tool.js";
import { createClaudeExecTool } from "./src/exec-tool.js";
import { createClaudeTeamsTool } from "./src/teams-tool.js";


const plugin = {
  id: "claude-code",
  name: "Claude Code",
  description: "Claude Code integration with plan, exec, and teams modes",
  configSchema: {
    jsonSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        allowedPaths: {
          type: "array",
          items: { type: "string" },
          description: "Directories where Claude Code is allowed to operate. Supports ~. Empty = deny all.",
        },
        maxTimeoutSecs: {
          type: "number",
          description: "Hard cap on timeout in seconds (default 600).",
        },
        maxConcurrent: {
          type: "number",
          description: "Max concurrent claude processes (default 2).",
        },
        blockedPermissionModes: {
          type: "array",
          items: { type: "string" },
          description: 'Permission modes to block (default ["full"]).',
        },
        claudeOauthToken: {
          type: "string",
          description: "OAuth token for Claude Code authentication.",
        },
      },
    },
  },
  register(api: OpenClawPluginApi) {
    // Apply security policy from plugin config before registering tools
    const cfg = (api.pluginConfig ?? {}) as Record<string, unknown>;
    setSecurityPolicy({
      allowedPaths: (cfg.allowedPaths as string[] | undefined) ?? [],
      maxTimeoutSecs: (cfg.maxTimeoutSecs as number | undefined) ?? 600,
      maxConcurrent: (cfg.maxConcurrent as number | undefined) ?? 2,
      blockedPermissionModes: (cfg.blockedPermissionModes as string[] | undefined) ?? ["full"],
      claudeOauthToken: cfg.claudeOauthToken as string | undefined,
    });

    api.logger.info(
      `[claude-code] Security policy: allowedPaths=${JSON.stringify(cfg.allowedPaths ?? [])}, ` +
      `maxTimeout=${cfg.maxTimeoutSecs ?? 600}s, maxConcurrent=${cfg.maxConcurrent ?? 2}, ` +
      `blockedModes=${JSON.stringify(cfg.blockedPermissionModes ?? ["full"])}, ` +
      `oauthToken=${cfg.claudeOauthToken ? "configured" : "NOT SET"}`,
    );

    api.registerTool(createClaudePlanTool(), { name: "claude_plan" });
    api.registerTool(createClaudeExecTool(), { name: "claude_exec" });
    api.registerTool(createClaudeTeamsTool(), { name: "claude_teams" });
  },
};

export default plugin;
