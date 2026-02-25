import { Type } from "@sinclair/typebox";
import { runClaude, textResult, errorResult, validateWorkdir, validatePermissionMode, clampTimeout } from "./shared.js";
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
  permission_mode: Type.Optional(
    Type.String({
      description:
        'Permission mode: "default" or "plan" (read-only). "full" is blocked by security policy.',
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
      "Use this for implementing features, fixing bugs, refactoring code, and other development tasks.",
    parameters: ExecToolSchema,
    async execute(
      _toolCallId: string,
      params: { task: string; workdir?: string; permission_mode?: string; timeout?: number },
    ): Promise<ClaudeResult> {
      const { task, workdir, permission_mode, timeout } = params;
      if (!task?.trim()) {
        return errorResult("task is required");
      }

      const pmErr = validatePermissionMode(permission_mode);
      if (pmErr) return errorResult(pmErr);

      const wdErr = validateWorkdir(workdir);
      if (wdErr) return errorResult(wdErr);

      const timeoutMs = clampTimeout(timeout, 300);
      const args: string[] = ["--print"];

      if (permission_mode && permission_mode !== "default") {
        args.push("--permission-mode", permission_mode);
      }

      args.push(task.trim());

      try {
        const result = await runClaude({ args, cwd: workdir, timeoutMs });

        if (result.exitCode !== 0) {
          const errMsg = result.stderr.trim() || result.stdout.trim() || "Claude Code exited with non-zero code";
          return errorResult(`Claude Code exec failed (exit ${result.exitCode}): ${errMsg}`);
        }

        return textResult(result.stdout.trim() || "(no output)", {
          mode: permission_mode || "default",
          exitCode: result.exitCode,
        });
      } catch (err) {
        return errorResult(`Failed to run Claude Code: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  };
}
