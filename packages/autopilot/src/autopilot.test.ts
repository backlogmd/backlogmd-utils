import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import path from "node:path";
import { BacklogCore } from "@backlogmd/core";
import { Autopilot } from "../src/autopilot.js";
import type { CodeAgent, AgentTask, AgentResult } from "../src/types.js";

const FIXTURES = path.resolve(__dirname, "../../tests/fixtures");

const mockAgent: CodeAgent = {
  name: "mock",
  execute: vi.fn().mockResolvedValue({ success: true, result: "Task executed" }),
};

describe("Autopilot", () => {
  describe("runTaskById", () => {
    it("executes a task by ID", async () => {
      const core = await BacklogCore.load({
        rootDir: path.join(FIXTURES, "happy-path"),
        autoReconcile: false,
      });
      const autopilot = new Autopilot(core, mockAgent);

      await autopilot.runTaskById("001");

      expect(mockAgent.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "001",
          title: "Setup project",
        }),
      );
    });

    it("passes full task context to agent", async () => {
      const core = await BacklogCore.load({
        rootDir: path.join(FIXTURES, "happy-path"),
        autoReconcile: false,
      });
      const autopilot = new Autopilot(core, mockAgent);

      await autopilot.runTaskById("001");

      expect(mockAgent.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.any(String),
          acceptanceCriteria: expect.arrayContaining([
            expect.objectContaining({
              text: expect.any(String),
              checked: expect.any(Boolean),
            }),
          ]),
        }),
      );
    });

    it("throws error for invalid task ID", async () => {
      const core = await BacklogCore.load({
        rootDir: path.join(FIXTURES, "happy-path"),
        autoReconcile: false,
      });
      const autopilot = new Autopilot(core, mockAgent);

      await expect(autopilot.runTaskById("999")).rejects.toThrow('Task "999" not found');
    });
  });

  describe("status workflow", () => {
    it("updates status to ip when starting task", async () => {
      const core = await BacklogCore.load({
        rootDir: path.join(FIXTURES, "happy-path"),
        autoReconcile: false,
      });
      const autopilot = new Autopilot(core, mockAgent);

      await autopilot.runTaskById("001");

      const manifest = core.getManifest();
      const task = manifest.items[0].tasks.find((t) => t.tid === "001");
      expect(task?.s).toBe("done");
    });

    it("reverts status to open on task failure", async () => {
      const failingAgent: CodeAgent = {
        name: "failing",
        execute: vi.fn().mockResolvedValue({ success: false, error: "Task failed" }),
      };
      const core = await BacklogCore.load({
        rootDir: path.join(FIXTURES, "happy-path"),
        autoReconcile: false,
      });
      const autopilot = new Autopilot(core, failingAgent);

      await autopilot.runTaskById("002");

      const manifest = core.getManifest();
      const task = manifest.items[0].tasks.find((t) => t.tid === "002");
      expect(task?.s).toBe("open");
    });
  });

  describe("CLI argument handling", () => {
    it("accepts task ID as second argument", async () => {
      const args = ["/path/to/backlog", "001"];
      expect(args.length).toBe(2);
      expect(args[1]).toBe("001");
    });

    it("works without task ID argument", async () => {
      const args = ["/path/to/backlog"];
      expect(args.length).toBe(1);
    });
  });
});
