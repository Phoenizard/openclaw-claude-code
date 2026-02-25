import { Type } from "@sinclair/typebox";
import { runClaude, textResult, errorResult, validateWorkdir, clampTimeout } from "./shared.js";
import type { ClaudeResult } from "./shared.js";

const ExecToolSchema = Type.Object({
  task: Type.String({
    description: "The task to send to Claude Code for execution.",
  }),
  workdir: Type.Optional(
    Type.String({
      description: "Working directory for Claude Code (defaults to cwd).",
    }),
  ),
  timeout: Type.Optional(
    Type.Number({
      description: "Timeout in seconds (default 300, max enforced by security policy).",
    }),
  ),
});

export function createClaudeExecTool() {
  return {
    name: "claude_exec",
    label: "Claude Code (Exec)",
    description:
      "Run Claude Code to execute a coding task. Claude Code can read, edit, create files, and run shell commands. " +
      "Use this for implementing features, fixing bugs, refactoring code, and other development tasks. " +
      "Operates in full-permission mode within whitelisted directories only.",
    parameters: ExecToolSchema,
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

      const timeoutMs = clampTimeout(timeout, 300);
      // Non-interactive mode requires "full" to auto-approve write operations.
      // Security is enforced by allowedPaths (checked before spawn) — claude
      // can only operate within whitelisted directories.
      const args: string[] = ["--print", "--permission-mode", "bypassPermissions", task.trim()];

      try {
        const result = await runClaude({ args, cwd: wd.resolved, timeoutMs });

        if (result.exitCode !== 0) {
          const errMsg = result.stderr.trim() || result.stdout.trim() || "Claude Code exited with non-zero code";
          return errorResult(`Claude Code exec failed (exit ${result.exitCode}): ${errMsg}`);
        }

        return textResult(result.stdout.trim() || "(no output)", {
          mode: "full",
          exitCode: result.exitCode,
        });
      } catch (err) {
        return errorResult(`Failed to run Claude Code: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  };
}
