import { Type } from "@sinclair/typebox";
import { runClaude, textResult, errorResult, validateWorkdir, clampTimeout } from "./shared.js";
import type { ClaudeResult } from "./shared.js";

const TeamsToolSchema = Type.Object({
  task: Type.String({
    description:
      "The task for Claude Code multi-agent teams. Describe the parallel work streams " +
      "(e.g. 'Frontend team: build login page. Backend team: implement auth API.').",
  }),
  workdir: Type.Optional(
    Type.String({
      description: "Working directory for Claude Code (defaults to cwd).",
    }),
  ),
  timeout: Type.Optional(
    Type.Number({
      description: "Timeout in seconds (default 600, max enforced by security policy).",
    }),
  ),
});

export function createClaudeTeamsTool() {
  return {
    name: "claude_teams",
    label: "Claude Code (Teams)",
    description:
      "Run Claude Code in multi-agent teams mode. Multiple Claude Code agents collaborate in parallel " +
      "with built-in file locking and coordination. Best for complex tasks that benefit from " +
      "parallel development within the same project (e.g. frontend + backend + tests simultaneously).",
    parameters: TeamsToolSchema,
    async execute(
      _toolCallId: string,
      params: { task: string; workdir?: string; timeout?: number },
    ): Promise<ClaudeResult> {
      const { task, workdir, timeout } = params;
      if (!task?.trim()) {
        return errorResult("task is required");
      }

      const wd = validateWorkdir(workdir);
      if (wd.error) return errorResult(wd.error);

      const timeoutMs = clampTimeout(timeout, 600);
      const args = ["--print", "--permission-mode", "bypassPermissions", task.trim()];
      const env: Record<string, string> = {
        CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: "1",
      };

      try {
        const result = await runClaude({ args, cwd: wd.resolved, env, timeoutMs });

        if (result.exitCode !== 0) {
          const errMsg = result.stderr.trim() || result.stdout.trim() || "Claude Code exited with non-zero code";
          return errorResult(`Claude Code teams failed (exit ${result.exitCode}): ${errMsg}`);
        }

        return textResult(result.stdout.trim() || "(no output)", {
          mode: "teams",
          exitCode: result.exitCode,
        });
      } catch (err) {
        return errorResult(`Failed to run Claude Code: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  };
}
