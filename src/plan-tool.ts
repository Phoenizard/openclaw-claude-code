import { Type } from "@sinclair/typebox";
import { runClaude, textResult, errorResult, validateWorkdir, clampTimeout } from "./shared.js";
import type { ClaudeResult } from "./shared.js";

const PlanToolSchema = Type.Object({
  task: Type.String({
    description: "The analysis or planning task to send to Claude Code in plan (read-only) mode.",
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

export function createClaudePlanTool() {
  return {
    name: "claude_plan",
    label: "Claude Code (Plan)",
    description:
      "Run Claude Code in plan (read-only) mode. Claude Code can read/search code, fetch web pages, " +
      "and analyze the codebase, but cannot create, edit, or delete files. " +
      "Use this for architecture analysis, code review, and implementation planning.",
    parameters: PlanToolSchema,
    async execute(
      _toolCallId: string,
      params: { task: string; workdir?: string; timeout?: number },
    ): Promise<ClaudeResult> {
      const { task, workdir, timeout } = params;
      if (!task?.trim()) {
        return errorResult("task is required");
      }

      const wdErr = validateWorkdir(workdir);
      if (wdErr) return errorResult(wdErr);

      const timeoutMs = clampTimeout(timeout, 300);
      const args = ["--permission-mode", "plan", "--print", task.trim()];

      try {
        const result = await runClaude({ args, cwd: workdir, timeoutMs });

        if (result.exitCode !== 0) {
          const errMsg = result.stderr.trim() || result.stdout.trim() || "Claude Code exited with non-zero code";
          return errorResult(`Claude Code plan failed (exit ${result.exitCode}): ${errMsg}`);
        }

        return textResult(result.stdout.trim() || "(no output)", {
          mode: "plan",
          exitCode: result.exitCode,
        });
      } catch (err) {
        return errorResult(`Failed to run Claude Code: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  };
}
