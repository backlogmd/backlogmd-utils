import { describe, it, expect } from "vitest";
import { parseManifest } from "./parseManifest.js";

const VALID_MANIFEST = JSON.stringify({
  specVersion: "3.0.0",
  updatedAt: "2026-02-13T12:00:00Z",
  openItemCount: 1,
  items: [
    {
      id: "001",
      slug: "chore-project-foundation",
      path: "work/001-chore-project-foundation",
      status: "open",
      updated: "2026-02-13T11:59:00Z",
      tasks: [
        {
          tid: "001",
          slug: "setup-repo",
          file: "001-setup-repo.md",
          t: "Set up repository structure",
          s: "done",
          p: 5,
          dep: [],
          a: "",
          h: false,
          expiresAt: null,
        },
        {
          tid: "002",
          slug: "init-ci",
          file: "002-init-ci.md",
          t: "Initialize CI pipeline",
          s: "reserved",
          p: 10,
          dep: ["001"],
          a: "alice",
          h: true,
          expiresAt: "2026-02-13T15:00:00Z",
        },
      ],
    },
  ],
});

const SOURCE = "manifest.json";

describe("parseManifest (SPEC v3)", () => {
  describe("valid manifest", () => {
    const { manifest, warnings } = parseManifest(VALID_MANIFEST, SOURCE);

    it("parses specVersion", () => {
      expect(manifest.specVersion).toBe("3.0.0");
    });

    it("parses updatedAt", () => {
      expect(manifest.updatedAt).toBe("2026-02-13T12:00:00Z");
    });

    it("parses openItemCount", () => {
      expect(manifest.openItemCount).toBe(1);
    });

    it("parses one item", () => {
      expect(manifest.items).toHaveLength(1);
      expect(manifest.items[0].id).toBe("001");
      expect(manifest.items[0].slug).toBe("chore-project-foundation");
      expect(manifest.items[0].path).toBe("work/001-chore-project-foundation");
      expect(manifest.items[0].status).toBe("open");
      expect(manifest.items[0].updated).toBe("2026-02-13T11:59:00Z");
    });

    it("parses two tasks in the item", () => {
      const tasks = manifest.items[0].tasks;
      expect(tasks).toHaveLength(2);

      expect(tasks[0].tid).toBe("001");
      expect(tasks[0].slug).toBe("setup-repo");
      expect(tasks[0].file).toBe("001-setup-repo.md");
      expect(tasks[0].t).toBe("Set up repository structure");
      expect(tasks[0].s).toBe("done");
      expect(tasks[0].p).toBe(5);
      expect(tasks[0].dep).toEqual([]);
      expect(tasks[0].a).toBe("");
      expect(tasks[0].h).toBe(false);
      expect(tasks[0].expiresAt).toBeNull();

      expect(tasks[1].tid).toBe("002");
      expect(tasks[1].s).toBe("reserved");
      expect(tasks[1].dep).toEqual(["001"]);
      expect(tasks[1].a).toBe("alice");
      expect(tasks[1].h).toBe(true);
      expect(tasks[1].expiresAt).toBe("2026-02-13T15:00:00Z");
    });

    it("produces no warnings", () => {
      expect(warnings).toHaveLength(0);
    });
  });

  describe("error handling", () => {
    it("throws on invalid JSON", () => {
      expect(() => parseManifest("not json", SOURCE)).toThrow(/Invalid JSON/);
    });

    it("throws on non-object JSON", () => {
      expect(() => parseManifest("[]", SOURCE)).toThrow(/must be a JSON object/);
    });

    it("throws on missing specVersion", () => {
      const json = JSON.stringify({ updatedAt: "x", items: [] });
      expect(() => parseManifest(json, SOURCE)).toThrow(/missing required field "specVersion"/);
    });

    it("throws on missing updatedAt", () => {
      const json = JSON.stringify({ specVersion: "3.0.0", items: [] });
      expect(() => parseManifest(json, SOURCE)).toThrow(/missing required field "updatedAt"/);
    });

    it("throws on missing items array", () => {
      const json = JSON.stringify({ specVersion: "3.0.0", updatedAt: "x" });
      expect(() => parseManifest(json, SOURCE)).toThrow(/missing "items" array/);
    });
  });

  describe("validation warnings", () => {
    it("warns on openItemCount mismatch", () => {
      const json = JSON.stringify({
        specVersion: "3.0.0",
        updatedAt: "2026-01-01T00:00:00Z",
        openItemCount: 5,
        items: [
          {
            id: "001",
            slug: "test",
            path: "work/001-test",
            status: "open",
            updated: "2026-01-01T00:00:00Z",
            tasks: [],
          },
        ],
      });
      const { warnings } = parseManifest(json, SOURCE);
      const w = warnings.find((w) => w.code === "MANIFEST_OPEN_COUNT_MISMATCH");
      expect(w).toBeDefined();
      expect(w!.message).toContain("5");
      expect(w!.message).toContain("1");
    });

    it("warns on invalid item status", () => {
      const json = JSON.stringify({
        specVersion: "3.0.0",
        updatedAt: "2026-01-01T00:00:00Z",
        openItemCount: 0,
        items: [
          {
            id: "001",
            slug: "test",
            path: "work/001-test",
            status: "deleted",
            updated: "2026-01-01T00:00:00Z",
            tasks: [],
          },
        ],
      });
      const { warnings } = parseManifest(json, SOURCE);
      const w = warnings.find((w) => w.code === "MANIFEST_INVALID_ITEM_STATUS");
      expect(w).toBeDefined();
    });

    it("warns on invalid task status", () => {
      const json = JSON.stringify({
        specVersion: "3.0.0",
        updatedAt: "2026-01-01T00:00:00Z",
        openItemCount: 1,
        items: [
          {
            id: "001",
            slug: "test",
            path: "work/001-test",
            status: "open",
            updated: "2026-01-01T00:00:00Z",
            tasks: [
              { tid: "001", slug: "t", file: "001-t.md", t: "T", s: "in-progress", p: 1, dep: [], a: "", h: false, expiresAt: null },
            ],
          },
        ],
      });
      const { warnings } = parseManifest(json, SOURCE);
      const w = warnings.find((w) => w.code === "MANIFEST_INVALID_TASK_STATUS");
      expect(w).toBeDefined();
      expect(w!.message).toContain("in-progress");
    });

    it("warns when done task has non-empty agent", () => {
      const json = JSON.stringify({
        specVersion: "3.0.0",
        updatedAt: "2026-01-01T00:00:00Z",
        openItemCount: 1,
        items: [
          {
            id: "001",
            slug: "test",
            path: "work/001-test",
            status: "open",
            updated: "2026-01-01T00:00:00Z",
            tasks: [
              { tid: "001", slug: "t", file: "001-t.md", t: "T", s: "done", p: 1, dep: [], a: "ghost-agent", h: false, expiresAt: null },
            ],
          },
        ],
      });
      const { warnings } = parseManifest(json, SOURCE);
      const w = warnings.find((w) => w.code === "MANIFEST_DONE_TASK_HAS_AGENT");
      expect(w).toBeDefined();
    });

    it("warns on missing item id", () => {
      const json = JSON.stringify({
        specVersion: "3.0.0",
        updatedAt: "2026-01-01T00:00:00Z",
        openItemCount: 1,
        items: [
          { slug: "test", path: "work/test", status: "open", updated: "2026-01-01T00:00:00Z", tasks: [] },
        ],
      });
      const { warnings } = parseManifest(json, SOURCE);
      const w = warnings.find((w) => w.code === "MANIFEST_ITEM_MISSING_ID");
      expect(w).toBeDefined();
    });

    it("warns on invalid item entry (not an object)", () => {
      const json = JSON.stringify({
        specVersion: "3.0.0",
        updatedAt: "2026-01-01T00:00:00Z",
        openItemCount: 0,
        items: ["not-an-object"],
      });
      const { manifest, warnings } = parseManifest(json, SOURCE);
      expect(manifest.items).toHaveLength(0);
      const w = warnings.find((w) => w.code === "MANIFEST_INVALID_ITEM");
      expect(w).toBeDefined();
    });

    it("warns on invalid task entry (not an object)", () => {
      const json = JSON.stringify({
        specVersion: "3.0.0",
        updatedAt: "2026-01-01T00:00:00Z",
        openItemCount: 1,
        items: [
          { id: "001", slug: "test", path: "work/001-test", status: "open", updated: "x", tasks: [42] },
        ],
      });
      const { warnings } = parseManifest(json, SOURCE);
      const w = warnings.find((w) => w.code === "MANIFEST_INVALID_TASK");
      expect(w).toBeDefined();
    });
  });

  describe("dep parsing in tasks", () => {
    it("parses dep as string array", () => {
      const json = JSON.stringify({
        specVersion: "3.0.0",
        updatedAt: "2026-01-01T00:00:00Z",
        openItemCount: 1,
        items: [
          {
            id: "001",
            slug: "test",
            path: "work/001-test",
            status: "open",
            updated: "x",
            tasks: [
              { tid: "003", slug: "t", file: "003-t.md", t: "T", s: "open", p: 1, dep: ["001", "002"], a: "", h: false, expiresAt: null },
            ],
          },
        ],
      });
      const { manifest } = parseManifest(json, SOURCE);
      expect(manifest.items[0].tasks[0].dep).toEqual(["001", "002"]);
    });

    it("defaults dep to empty array when missing", () => {
      const json = JSON.stringify({
        specVersion: "3.0.0",
        updatedAt: "2026-01-01T00:00:00Z",
        openItemCount: 1,
        items: [
          {
            id: "001",
            slug: "test",
            path: "work/001-test",
            status: "open",
            updated: "x",
            tasks: [
              { tid: "001", slug: "t", file: "001-t.md", t: "T", s: "open", p: 1, a: "", h: false, expiresAt: null },
            ],
          },
        ],
      });
      const { manifest } = parseManifest(json, SOURCE);
      expect(manifest.items[0].tasks[0].dep).toEqual([]);
    });
  });

  describe("archived items", () => {
    it("parses archived item status", () => {
      const json = JSON.stringify({
        specVersion: "3.0.0",
        updatedAt: "2026-01-01T00:00:00Z",
        openItemCount: 0,
        items: [
          {
            id: "001",
            slug: "old-feature",
            path: "work/001-old-feature",
            status: "archived",
            updated: "2025-12-01T00:00:00Z",
            tasks: [],
          },
        ],
      });
      const { manifest, warnings } = parseManifest(json, SOURCE);
      expect(manifest.items[0].status).toBe("archived");
      expect(warnings).toHaveLength(0);
    });
  });
});
