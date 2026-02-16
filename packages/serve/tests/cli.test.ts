import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseArgs, run } from "../src/cli.js";

describe("cli parseArgs", () => {
  it("returns defaults when no arguments given", () => {
    const args = parseArgs([]);
    expect(args.rootDir).toBe(process.cwd());
    expect(args.port).toBe(3030);
    expect(args.host).toBe("localhost");
    expect(args.help).toBe(false);
  });

  it("parses --dir as project root", () => {
    const args = parseArgs(["--dir", "/tmp/my-project"]);
    expect(args.rootDir).toBe("/tmp/my-project");
  });

  it("parses --port", () => {
    const args = parseArgs(["--port", "8080"]);
    expect(args.port).toBe(8080);
  });

  it("parses --host", () => {
    const args = parseArgs(["--host", "0.0.0.0"]);
    expect(args.host).toBe("0.0.0.0");
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
    const args = parseArgs(["--dir", "/a", "--port", "9000", "--host", "0.0.0.0", "--help"]);
    expect(args.rootDir).toBe("/a");
    expect(args.port).toBe(9000);
    expect(args.host).toBe("0.0.0.0");
    expect(args.help).toBe(true);
  });

  it("throws on --dir without value", () => {
    expect(() => parseArgs(["--dir"])).toThrow("--dir requires a path argument");
  });

  it("throws on --port without value", () => {
    expect(() => parseArgs(["--port"])).toThrow("--port requires a port argument");
  });

  it("throws on --host without value", () => {
    expect(() => parseArgs(["--host"])).toThrow("--host requires a host argument");
  });

  it("throws on unknown argument", () => {
    expect(() => parseArgs(["--verbose"])).toThrow("Unknown argument: --verbose");
  });

  it("validates port number", () => {
    expect(() => parseArgs(["--port", "0"])).toThrow("--port must be a valid port number");
    expect(() => parseArgs(["--port", "abc"])).toThrow("--port must be a valid port number");
    expect(() => parseArgs(["--port", "70000"])).toThrow("--port must be a valid port number");
  });
});

describe("cli run", () => {
  it("creates .backlogmd/work/ and starts server when neither exists", () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), "backlogmd-cli-"));
    const port = 3030 + Math.floor(Math.random() * 1000);
    const exitCode = run(["--dir", emptyDir, "--port", String(port)]);
    expect(exitCode).toBe(0);
    expect(fs.existsSync(path.join(emptyDir, ".backlogmd"))).toBe(true);
    expect(fs.existsSync(path.join(emptyDir, ".backlogmd", "work"))).toBe(true);
    fs.rmSync(emptyDir, { recursive: true, force: true });
  });
});
