import { describe, it, expect, beforeEach } from "vitest";
import {
  setSecurityPolicy,
  validateWorkdir,
  clampTimeout,
  acquireSlot,
  releaseSlot,
  resolveClaudeBin,
  textResult,
  errorResult,
} from "../shared.js";

describe("validateWorkdir", () => {
  beforeEach(() => {
    setSecurityPolicy({
      allowedPaths: ["/home/user/projects", "/tmp/sandbox"],
      maxTimeoutSecs: 600,
      maxConcurrent: 2,
      blockedPermissionModes: [],
    });
  });

  it("returns empty object when workdir is undefined", () => {
    expect(validateWorkdir(undefined)).toEqual({});
  });

  it("accepts paths under allowedPaths", () => {
    const result = validateWorkdir("/home/user/projects/my-app");
    expect(result.resolved).toBe("/home/user/projects/my-app");
    expect(result.error).toBeUndefined();
  });

  it("accepts exact allowedPath", () => {
    const result = validateWorkdir("/tmp/sandbox");
    expect(result.resolved).toBe("/tmp/sandbox");
  });

  it("rejects paths outside allowedPaths", () => {
    const result = validateWorkdir("/etc/passwd");
    expect(result.error).toContain("not under any allowed path");
  });

  it("rejects when no allowedPaths configured", () => {
    setSecurityPolicy({ allowedPaths: [] });
    const result = validateWorkdir("/home/user/projects");
    expect(result.error).toContain("no allowedPaths configured");
  });

  it("blocks path traversal attempts", () => {
    const result = validateWorkdir("/home/user/projects/../../etc");
    expect(result.error).toContain("not under any allowed path");
  });
});

describe("clampTimeout", () => {
  beforeEach(() => {
    setSecurityPolicy({ maxTimeoutSecs: 600 });
  });

  it("returns default when no value provided", () => {
    expect(clampTimeout(undefined, 300)).toBe(300_000);
  });

  it("uses requested value when within limits", () => {
    expect(clampTimeout(120, 300)).toBe(120_000);
  });

  it("clamps to maxTimeoutSecs", () => {
    expect(clampTimeout(9999, 300)).toBe(600_000);
  });

  it("clamps minimum to 1 second", () => {
    expect(clampTimeout(-10, 300)).toBe(1_000);
  });
});

describe("concurrency guard", () => {
  beforeEach(() => {
    setSecurityPolicy({ maxConcurrent: 2 });
    // Reset slots
    releaseSlot();
    releaseSlot();
    releaseSlot();
  });

  it("acquires slots up to limit", () => {
    expect(acquireSlot()).toBeNull();
    expect(acquireSlot()).toBeNull();
  });

  it("rejects when limit reached", () => {
    acquireSlot();
    acquireSlot();
    expect(acquireSlot()).toContain("concurrency limit reached");
  });

  it("allows acquisition after release", () => {
    acquireSlot();
    acquireSlot();
    releaseSlot();
    expect(acquireSlot()).toBeNull();
  });
});

describe("resolveClaudeBin", () => {
  it("returns a string", () => {
    expect(typeof resolveClaudeBin()).toBe("string");
  });
});

describe("result helpers", () => {
  it("textResult returns correct format", () => {
    const result = textResult("hello");
    expect(result.content).toEqual([{ type: "text", text: "hello" }]);
  });

  it("textResult includes details when provided", () => {
    const result = textResult("hello", { foo: 1 });
    expect(result.details).toEqual({ foo: 1 });
  });

  it("textResult omits details when not provided", () => {
    const result = textResult("hello");
    expect(result).not.toHaveProperty("details");
  });

  it("errorResult prefixes with Error:", () => {
    const result = errorResult("bad thing");
    expect(result.content[0].text).toBe("Error: bad thing");
  });
});
