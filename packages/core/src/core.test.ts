import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { BacklogCore } from "./core.js";

describe("BacklogCore", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "backlog-core-test-"));
  });

  describe("load", () => {
    it("creates manifest.json if not exists", async () => {
      const core = await BacklogCore.load({ rootDir: tmpDir });
      const manifest = core.getManifest();

      expect(manifest.specVersion).toBe("3.0.0");
      expect(manifest.items).toEqual([]);
      expect(fs.existsSync(path.join(tmpDir, "manifest.json"))).toBe(true);
    });

    it("loads existing manifest.json", async () => {
      const manifest = {
        specVersion: "3.0.0",
        updatedAt: "2026-01-01T00:00:00Z",
        openItemCount: 1,
        items: [
          {
            id: "001",
            slug: "test-item",
            path: "work/test-item",
            status: "open",
            updated: "2026-01-01T00:00:00Z",
            tasks: [
              {
                tid: "001",
                slug: "test-task",
                file: "001-test-task.md",
                t: "Test Task",
                s: "open",
                p: 5,
                dep: [],
                a: "",
                h: false,
                expiresAt: null,
              },
            ],
          },
        ],
      };
      fs.mkdirSync(path.join(tmpDir, "work", "test-item"), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, "manifest.json"), JSON.stringify(manifest));

      const core = await BacklogCore.load({ rootDir: tmpDir });
      const loaded = core.getManifest();

      expect(loaded.items).toHaveLength(1);
      expect(loaded.items[0].slug).toBe("test-item");
    });
  });

  describe("addItem", () => {
    it("adds a new item to manifest and creates folder", async () => {
      const core = await BacklogCore.load({ rootDir: tmpDir });

      await core.addItem({ title: "My New Feature" });

      const manifest = core.getManifest();
      expect(manifest.items).toHaveLength(1);
      expect(manifest.items[0].slug).toContain("my-new-feature");
      expect(manifest.items[0].status).toBe("open");

      expect(fs.existsSync(path.join(tmpDir, "work", manifest.items[0].slug))).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, "work", manifest.items[0].slug, "index.md"))).toBe(
        true,
      );
    });

    it("adds item with type", async () => {
      const core = await BacklogCore.load({ rootDir: tmpDir });

      await core.addItem({ title: "New Feature", type: "feat" });

      const manifest = core.getManifest();
      expect(manifest.items[0].slug).toContain("feat");
    });
  });

  describe("addTask", () => {
    it("adds a task to existing item", async () => {
      const core = await BacklogCore.load({ rootDir: tmpDir });
      await core.addItem({ title: "Test Item" });

      const manifest = core.getManifest();
      const itemSlug = manifest.items[0].slug;

      await core.addTask(itemSlug, { title: "First Task" });

      const updatedManifest = core.getManifest();
      expect(updatedManifest.items[0].tasks).toHaveLength(1);
      expect(updatedManifest.items[0].tasks[0].t).toBe("First Task");
      expect(updatedManifest.items[0].tasks[0].s).toBe("open");
    });

    it("creates task file when adding task", async () => {
      const core = await BacklogCore.load({ rootDir: tmpDir });
      await core.addItem({ title: "Test Item" });

      const manifest = core.getManifest();
      const itemSlug = manifest.items[0].slug;

      await core.addTask(itemSlug, { title: "First Task" });

      const taskFile = path.join(tmpDir, "work", itemSlug, "001-first-task.md");
      expect(fs.existsSync(taskFile)).toBe(true);
      const content = fs.readFileSync(taskFile, "utf-8");
      expect(content).toContain("t: First Task");
      expect(content).toContain("s: open");
    });
  });

  describe("closeTask", () => {
    it("updates task status to done", async () => {
      const core = await BacklogCore.load({ rootDir: tmpDir });
      await core.addItem({ title: "Test Item" });

      const manifest = core.getManifest();
      const itemSlug = manifest.items[0].slug;
      await core.addTask(itemSlug, { title: "Task to Close" });

      const taskId = core.getManifest().items[0].tasks[0].tid;
      await core.closeTask(taskId);

      const updatedManifest = core.getManifest();
      expect(updatedManifest.items[0].tasks[0].s).toBe("done");
    });

    it("patches task file when closing", async () => {
      const core = await BacklogCore.load({ rootDir: tmpDir });
      await core.addItem({ title: "Test Item" });

      const manifest = core.getManifest();
      const itemSlug = manifest.items[0].slug;
      await core.addTask(itemSlug, { title: "Task to Close" });

      const task = core.getManifest().items[0].tasks[0];
      await core.closeTask(task.tid);

      const taskFile = path.join(tmpDir, itemSlug, task.file);
      const content = fs.readFileSync(taskFile, "utf-8");
      expect(content).toContain("s: done");
    });
  });

  describe("startTask", () => {
    it("updates task status to ip", async () => {
      const core = await BacklogCore.load({ rootDir: tmpDir });
      await core.addItem({ title: "Test Item" });

      const manifest = core.getManifest();
      const itemSlug = manifest.items[0].slug;
      await core.addTask(itemSlug, { title: "Task to Start" });

      const taskId = core.getManifest().items[0].tasks[0].tid;
      await core.startTask(taskId);

      const updatedManifest = core.getManifest();
      expect(updatedManifest.items[0].tasks[0].s).toBe("ip");
    });

    it("sets status to review when human review is required", async () => {
      const core = await BacklogCore.load({ rootDir: tmpDir });
      await core.addItem({ title: "Test Item" });

      const manifest = core.getManifest();
      const itemSlug = manifest.items[0].slug;
      await core.addTask(itemSlug, { title: "Task to Start", priority: 5 });

      const task = core.getManifest().items[0].tasks[0];
      const taskFilePath = path.join(tmpDir, itemSlug, task.file);
      let content = fs.readFileSync(taskFilePath, "utf-8");
      content = content.replace("h: false", "h: true");
      fs.writeFileSync(taskFilePath, content);

      await core.startTask(task.tid);

      const updatedManifest = core.getManifest();
      expect(updatedManifest.items[0].tasks[0].s).toBe("review");
    });
  });

  describe("archiveItem", () => {
    it("archives item when all tasks are done", async () => {
      const core = await BacklogCore.load({ rootDir: tmpDir });
      await core.addItem({ title: "Test Item" });

      const manifest = core.getManifest();
      const itemSlug = manifest.items[0].slug;
      await core.addTask(itemSlug, { title: "Task 1" });
      await core.addTask(itemSlug, { title: "Task 2" });

      await core.closeTask("001");
      await core.closeTask("002");

      await core.archiveItem(itemSlug);

      const updatedManifest = core.getManifest();
      expect(updatedManifest.items[0].status).toBe("archived");
      expect(updatedManifest.openItemCount).toBe(0);
    });

    it("throws if not all tasks are done", async () => {
      const core = await BacklogCore.load({ rootDir: tmpDir });
      await core.addItem({ title: "Test Item" });

      const manifest = core.getManifest();
      const itemSlug = manifest.items[0].slug;
      await core.addTask(itemSlug, { title: "Task 1" });
      await core.addTask(itemSlug, { title: "Task 2" });

      await core.closeTask("001");

      await expect(core.archiveItem(itemSlug)).rejects.toThrow("not all tasks are done");
    });
  });

  describe("operation queue", () => {
    it("serializes operations", async () => {
      const core = await BacklogCore.load({ rootDir: tmpDir });
      await core.addItem({ title: "Test Item" });

      const manifest = core.getManifest();
      const itemSlug = manifest.items[0].slug;

      const ops = [
        core.addTask(itemSlug, { title: "Task 1" }),
        core.addTask(itemSlug, { title: "Task 2" }),
        core.addTask(itemSlug, { title: "Task 3" }),
      ];

      await Promise.all(ops);

      const finalManifest = core.getManifest();
      expect(finalManifest.items[0].tasks).toHaveLength(3);
    });
  });
});
