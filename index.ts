import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { emptyPluginConfigSchema } from "openclaw/plugin-sdk";
import { createClaudePlanTool } from "./src/plan-tool.js";
import { createClaudeExecTool } from "./src/exec-tool.js";
import { createClaudeTeamsTool } from "./src/teams-tool.js";

const plugin = {
  id: "claude-code",
  name: "Claude Code",
  description: "Claude Code integration with plan, exec, and teams modes",
  configSchema: emptyPluginConfigSchema(),
  register(api: OpenClawPluginApi) {
    api.registerTool(createClaudePlanTool(), { name: "claude_plan" });
    api.registerTool(createClaudeExecTool(), { name: "claude_exec" });
    api.registerTool(createClaudeTeamsTool(), { name: "claude_teams" });
  },
};

export default plugin;
