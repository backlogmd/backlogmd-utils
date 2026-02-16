import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { BacklogCore } from "./core.js";

describe("BacklogCore (SPEC v4, parser + writer only)", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "backlog-core-test-"));
  });

  describe("load", () => {
    it("returns empty state when work/ is empty or missing", async () => {
      const core = await BacklogCore.load({ rootDir: tmpDir });
      const state = core.getState();

      expect(state.items).toEqual([]);
      expect(state.tasks).toEqual([]);
      expect(state.entries).toEqual([]);
      expect(fs.existsSync(path.join(tmpDir, "manifest.json"))).toBe(false);
    });

    it("parses existing work/ from disk", async () => {
      const workDir = path.join(tmpDir, "work", "001-feat-test");
      fs.mkdirSync(workDir, { recursive: true });
      fs.writeFileSync(
        path.join(workDir, "index.md"),
        `<!-- METADATA -->
\`\`\`yaml
work: Test feature
status: open
\`\`\`
<!-- DESCRIPTION -->
Test
<!-- CONTEXT -->
(empty)
`,
        "utf-8",
      );

      const core = await BacklogCore.load({ rootDir: tmpDir });
      const state = core.getState();

      expect(state.items).toHaveLength(1);
      expect(state.items[0].slug).toBe("001-feat-test");
    });
  });

  describe("addItem", () => {
    it("creates work item via writer and re-parses state", async () => {
      const core = await BacklogCore.load({ rootDir: tmpDir });

      await core.addItem({ title: "My New Feature" });

      const state = core.getState();
      expect(state.items).toHaveLength(1);
      expect(state.items[0].slug).toContain("my-new-feature");

      expect(fs.existsSync(path.join(tmpDir, "work", state.items[0].slug))).toBe(true);
      expect(
        fs.existsSync(path.join(tmpDir, "work", state.items[0].slug, "index.md")),
      ).toBe(true);
    });

    it("adds item with type (feat)", async () => {
      const core = await BacklogCore.load({ rootDir: tmpDir });
      await core.addItem({ title: "New Feature", type: "feat" });

      const state = core.getState();
      expect(state.items[0].slug).toContain("feat");
    });
  });

  describe("addTask", () => {
    it("creates task via writer and re-parses state", async () => {
      const core = await BacklogCore.load({ rootDir: tmpDir });
      await core.addItem({ title: "Test Item" });

      const state = core.getState();
      const itemSlug = state.items[0].slug;

      await core.addTask(itemSlug, { title: "First Task" });

      const after = core.getState();
      expect(after.tasks).toHaveLength(1);
      expect(after.tasks[0].name).toBe("First Task");
      expect(after.tasks[0].status).toBe("open");
    });

    it("creates task file in SPEC v4 format", async () => {
      const core = await BacklogCore.load({ rootDir: tmpDir });
      await core.addItem({ title: "Test Item" });
      const state = core.getState();
      const itemSlug = state.items[0].slug;

      await core.addTask(itemSlug, { title: "First Task" });

      const taskFile = path.join(tmpDir, "work", itemSlug, "001-first-task.md");
      expect(fs.existsSync(taskFile)).toBe(true);
      const content = fs.readFileSync(taskFile, "utf-8");
      expect(content).toContain("task: First Task");
      expect(content).toContain("status: open");
    });
  });

  describe("closeTask", () => {
    it("updates task status to done via writer", async () => {
      const core = await BacklogCore.load({ rootDir: tmpDir });
      await core.addItem({ title: "Test Item" });
      const state = core.getState();
      const itemSlug = state.items[0].slug;
      await core.addTask(itemSlug, { title: "Task to Close" });

      const afterAdd = core.getState();
      const task = afterAdd.tasks[0];
      await core.closeTask(task.source);

      const afterClose = core.getState();
      expect(afterClose.tasks[0].status).toBe("done");
    });
  });

  describe("removeItem", () => {
    it("removes work item dir via writer", async () => {
      const core = await BacklogCore.load({ rootDir: tmpDir });
      await core.addItem({ title: "To Remove" });
      const state = core.getState();
      const slug = state.items[0].slug;

      await core.removeItem(slug);

      expect(fs.existsSync(path.join(tmpDir, "work", slug))).toBe(false);
      expect(core.getState().items).toHaveLength(0);
    });
  });

  describe("removeTask", () => {
    it("removes task file via writer", async () => {
      const core = await BacklogCore.load({ rootDir: tmpDir });
      await core.addItem({ title: "Item" });
      const itemSlug = core.getState().items[0].slug;
      await core.addTask(itemSlug, { title: "Task" });
      const taskSource = core.getState().tasks[0].source;

      await core.removeTask(taskSource);

      expect(fs.existsSync(path.join(tmpDir, taskSource))).toBe(false);
      expect(core.getState().tasks).toHaveLength(0);
    });
  });
});
