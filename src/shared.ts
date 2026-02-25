import { spawn } from "node:child_process";
import { resolve as resolvePath, join } from "node:path";
import { homedir } from "node:os";
import { readdirSync } from "node:fs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ClaudeResult = {
  content: Array<{ type: "text"; text: string }>;
  details?: unknown;
};

export type SecurityPolicy = {
  /** Allowed working directories (resolved to absolute paths). Empty = deny all. */
  allowedPaths: string[];
  /** Maximum timeout in seconds. Requests above this are clamped. */
  maxTimeoutSecs: number;
  /** Maximum concurrent claude processes. */
  maxConcurrent: number;
  /** Blocked permission modes (e.g. ["full"]). */
  blockedPermissionModes: string[];
  /** OAuth token for Claude Code authentication. */
  claudeOauthToken?: string;
};

// ---------------------------------------------------------------------------
// Defaults — secure by default, loosened via plugin config
// ---------------------------------------------------------------------------

const DEFAULT_POLICY: SecurityPolicy = {
  allowedPaths: [],           // empty = must configure explicitly
  maxTimeoutSecs: 600,        // 10 min hard cap
  maxConcurrent: 2,
  blockedPermissionModes: ["full"],
};

let _policy: SecurityPolicy = { ...DEFAULT_POLICY };

export function setSecurityPolicy(partial: Partial<SecurityPolicy>): void {
  _policy = { ...DEFAULT_POLICY, ...partial };
  // Resolve ~ and ensure absolute
  _policy.allowedPaths = _policy.allowedPaths.map((p) =>
    resolvePath(p.replace(/^~/, homedir())),
  );
}

export function getSecurityPolicy(): Readonly<SecurityPolicy> {
  return _policy;
}

// ---------------------------------------------------------------------------
// Path validation — resolve then check prefix match against allowlist
// ---------------------------------------------------------------------------

/**
 * Validate and resolve workdir. Returns { error } on rejection,
 * or { resolved } with the absolute path (~ expanded) on success.
 */
export function validateWorkdir(workdir: string | undefined): { resolved?: string; error?: string } {
  if (!workdir) return {}; // will use process.cwd()

  const resolved = resolvePath(workdir.replace(/^~/, homedir()));

  if (_policy.allowedPaths.length === 0) {
    return { error: `workdir rejected: no allowedPaths configured in plugin security policy` };
  }

  const allowed = _policy.allowedPaths.some(
    (prefix) => resolved === prefix || resolved.startsWith(prefix + "/"),
  );
  if (!allowed) {
    return { error: `workdir rejected: "${resolved}" is not under any allowed path [${_policy.allowedPaths.join(", ")}]` };
  }

  return { resolved };
}

// ---------------------------------------------------------------------------
// Permission mode validation
// ---------------------------------------------------------------------------

export function validatePermissionMode(mode: string | undefined): string | null {
  if (!mode) return null;
  if (_policy.blockedPermissionModes.includes(mode)) {
    return `permission mode "${mode}" is blocked by security policy`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Timeout clamping
// ---------------------------------------------------------------------------

export function clampTimeout(requestedSecs: number | undefined, defaultSecs: number): number {
  const secs = requestedSecs ?? defaultSecs;
  return Math.min(Math.max(1, secs), _policy.maxTimeoutSecs) * 1000;
}

// ---------------------------------------------------------------------------
// Concurrency guard
// ---------------------------------------------------------------------------

let _running = 0;

function acquireSlot(): string | null {
  if (_running >= _policy.maxConcurrent) {
    return `concurrency limit reached (${_policy.maxConcurrent} claude processes already running)`;
  }
  _running++;
  return null;
}

function releaseSlot(): void {
  _running = Math.max(0, _running - 1);
}

// ---------------------------------------------------------------------------
// Core: spawn claude
// ---------------------------------------------------------------------------

export function resolveClaudeBin(): string {
  if (process.env.CLAUDE_BIN) return process.env.CLAUDE_BIN;

  // Prefer symlink at ~/bin/claude (no spaces in path, survives upgrades).
  // Create with: ln -sf "/Users/.../Claude/claude-code/<ver>/claude" ~/bin/claude
  const symlink = join(homedir(), "bin", "claude");
  try {
    const { statSync } = require("node:fs") as typeof import("node:fs");
    if (statSync(symlink).isFile() || statSync(symlink).isSymbolicLink()) {
      return symlink;
    }
  } catch {
    // not found — try versioned path
  }

  // Claude Desktop installs the binary under a versioned directory.
  const base = join(homedir(), "Library", "Application Support", "Claude", "claude-code");
  try {
    const versions = readdirSync(base).sort();
    if (versions.length > 0) {
      return join(base, versions[versions.length - 1], "claude");
    }
  } catch {
    // directory doesn't exist — fall through
  }

  return "claude";
}

export async function runClaude(params: {
  args: string[];
  cwd?: string;
  env?: Record<string, string>;
  timeoutMs?: number;
}): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
  const { args, cwd, env, timeoutMs = 300_000 } = params;

  const slotErr = acquireSlot();
  if (slotErr) throw new Error(slotErr);

  try {
    return await new Promise((resolve, reject) => {
      const authEnv: Record<string, string> = {};
      if (_policy.claudeOauthToken) {
        authEnv.CLAUDE_CODE_OAUTH_TOKEN = _policy.claudeOauthToken;
      }

      const proc = spawn(resolveClaudeBin(), args, {
        cwd: cwd || process.cwd(),
        env: { ...process.env, ...authEnv, ...env },
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
  } finally {
    releaseSlot();
  }
}

// ---------------------------------------------------------------------------
// Result helpers
// ---------------------------------------------------------------------------

export function textResult(text: string, details?: unknown): ClaudeResult {
  return {
    content: [{ type: "text" as const, text }],
    ...(details !== undefined ? { details } : {}),
  };
}

export function errorResult(message: string): ClaudeResult {
  return textResult(`Error: ${message}`);
}
