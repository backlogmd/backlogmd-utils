import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { parseArgs } from "../src/cli.js";

describe("parseArgs", () => {
  it("returns defaults when no arguments given", () => {
    const args = parseArgs([]);
    expect(args.input).toContain(".backlogmd");
    expect(args.output).toBeNull();
    expect(args.help).toBe(false);
  });

  it("parses --input with path", () => {
    const args = parseArgs(["--input", "/tmp/my-backlog"]);
    expect(args.input).toBe("/tmp/my-backlog");
  });

  it("parses --input with URL", () => {
    const args = parseArgs(["--input", "https://example.com/backlog.md"]);
    expect(args.input).toBe("https://example.com/backlog.md");
  });

  it("parses --output", () => {
    const args = parseArgs(["--output", "/tmp/out.json"]);
    expect(args.output).toBe("/tmp/out.json");
  });

  it("parses --help", () => {
    const args = parseArgs(["--help"]);
    expect(args.help).toBe(true);
  });

  it("parses -h as help", () => {
    const args = parseArgs(["-h"]);
    expect(args.help).toBe(true);
  });

  it("parses all options together", () => {
    const args = parseArgs(["--input", "/a", "--output", "/b", "--help"]);
    expect(args.input).toBe("/a");
    expect(args.output).toBe("/b");
    expect(args.help).toBe(true);
  });

  it("throws on --input without value", () => {
    expect(() => parseArgs(["--input"])).toThrow("--input requires a path or URL argument");
  });

  it("throws on --output without value", () => {
    expect(() => parseArgs(["--output"])).toThrow("--output requires a path argument");
  });

  it("throws on unknown argument", () => {
    expect(() => parseArgs(["--verbose"])).toThrow("Unknown argument: --verbose");
  });
});

describe("run", () => {
  let run: (argv: string[]) => Promise<number>;

  let logOutput: string[];
  let errorOutput: string[];
  const origLog = console.log;
  const origError = console.error;

  beforeEach(async () => {
    const mod = await import("../src/cli.js");
    run = mod.run;
    logOutput = [];
    errorOutput = [];
    console.log = (...args: unknown[]) => logOutput.push(args.join(" "));
    console.error = (...args: unknown[]) => errorOutput.push(args.join(" "));
  });

  afterEach(() => {
    console.log = origLog;
    console.error = origError;
    vi.restoreAllMocks();
  });

  it("returns 0 and prints help with --help", async () => {
    const code = await run(["--help"]);
    expect(code).toBe(0);
    expect(logOutput.join("\n")).toContain("Usage:");
  });

  it("returns 1 when root directory does not exist", async () => {
    const code = await run(["--input", "/nonexistent/path/.backlogmd"]);
    expect(code).toBe(1);
    expect(errorOutput.join("\n")).toContain("not found");
  });

  it("returns 0 on valid fixture with no errors", async () => {
    const fixturePath = new URL("fixtures/spec-v4", import.meta.url).pathname;
    const code = await run(["--input", fixturePath]);
    expect(code).toBe(0);
    expect(logOutput.length).toBeGreaterThan(0);
    const json = JSON.parse(logOutput.join("\n"));
    expect(json.protocol).toBeDefined();
    expect(json.entries).toBeDefined();
    expect(json.tasks).toBeDefined();
  });

  it("returns 1 on unknown argument", async () => {
    const code = await run(["--foo"]);
    expect(code).toBe(1);
    expect(errorOutput.join("\n")).toContain("Unknown argument");
  });

  it("fetches remote URL successfully", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => "# Hello World\n\nTest content",
    });

    const code = await run(["--input", "https://example.com/test.md"]);
    expect(code).toBe(0);
    expect(logOutput.join("\n")).toContain("# Hello World");
  });

  it("handles 404 error on remote fetch", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    const code = await run(["--input", "https://example.com/nonexistent.md"]);
    expect(code).toBe(1);
    expect(errorOutput.join("\n")).toContain("404");
  });

  it("handles network error on remote fetch", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const code = await run(["--input", "https://example.com/test.md"]);
    expect(code).toBe(1);
    expect(errorOutput.join("\n")).toContain("Network error");
  });
});
