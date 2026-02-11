import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { watchBacklogDir } from "../src/watcher.js";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

describe("watcher", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "backlog-watch-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("callback fires when .md file is written to watched dir", async () => {
    const callback = vi.fn();
    const watcher = watchBacklogDir(tempDir, callback);

    await fs.writeFile(path.join(tempDir, "test.md"), "# Test");
    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(callback).toHaveBeenCalled();

    watcher.close();
  });

  it("does not fire callback for non-.md files", async () => {
    const callback = vi.fn();
    const watcher = watchBacklogDir(tempDir, callback);

    await fs.writeFile(path.join(tempDir, "test.json"), "{}");
    await fs.writeFile(path.join(tempDir, "test.ts"), "const x = 1;");
    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(callback).not.toHaveBeenCalled();

    watcher.close();
  });

  it("watcher.close() does not throw", async () => {
    const callback = vi.fn();
    const watcher = watchBacklogDir(tempDir, callback);

    await fs.writeFile(path.join(tempDir, "test.md"), "# Test");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    expect(callback).toHaveBeenCalled();

    expect(() => watcher.close()).not.toThrow();
  });
});
