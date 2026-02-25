import { spawn } from "node:child_process";

export type ClaudeResult = {
  content: Array<{ type: "text"; text: string }>;
  details?: unknown;
};

/**
 * Resolve the claude binary path.
 * Prefers `claude` on PATH; falls back to common install locations.
 */
export function resolveClaudeBin(): string {
  return "claude";
}

/**
 * Spawn `claude` with the given args and env overrides.
 * Collects stdout+stderr and resolves when the process exits.
 * Rejects if the process fails to start or exits with a non-zero code.
 */
export function runClaude(params: {
  args: string[];
  cwd?: string;
  env?: Record<string, string>;
  timeoutMs?: number;
}): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
  const { args, cwd, env, timeoutMs = 300_000 } = params;

  return new Promise((resolve, reject) => {
    const proc = spawn(resolveClaudeBin(), args, {
      cwd: cwd || process.cwd(),
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
      timeout: timeoutMs,
    });

    const chunks: Buffer[] = [];
    const errChunks: Buffer[] = [];

    proc.stdout.on("data", (d: Buffer) => chunks.push(d));
    proc.stderr.on("data", (d: Buffer) => errChunks.push(d));

    proc.on("error", reject);
    proc.on("close", (code) => {
      resolve({
        stdout: Buffer.concat(chunks).toString("utf-8"),
        stderr: Buffer.concat(errChunks).toString("utf-8"),
        exitCode: code,
      });
    });
  });
}

export function textResult(text: string, details?: unknown): ClaudeResult {
  return {
    content: [{ type: "text" as const, text }],
    ...(details !== undefined ? { details } : {}),
  };
}

export function errorResult(message: string): ClaudeResult {
  return textResult(`Error: ${message}`);
}
