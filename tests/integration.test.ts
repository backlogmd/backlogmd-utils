import { describe, it, expect } from "vitest";
import path from "node:path";
import { buildBacklogOutput, serializeOutput } from "@backlogmd/parser";

const FIXTURES = path.resolve(__dirname, "fixtures");

describe("integration: spec-v4 fixture (SPEC v4 – task discovery by dir listing)", () => {
  const output = buildBacklogOutput(path.join(FIXTURES, "spec-v4"));

  it("parses entries with item status and assignee from index", () => {
    expect(output.entries.length).toBeGreaterThanOrEqual(1);
    const openEntry = output.entries.find((e) => e.slug === "001-chore-project-foundation");
    expect(openEntry).toBeDefined();
    expect(openEntry!.id).toBe("001");
    expect(openEntry!.type).toBe("chore");
    expect(openEntry!.status).toBe("open");
    const claimedEntry = output.entries.find((e) => e.slug === "002-feat-claimed-item");
    if (claimedEntry) {
      expect(claimedEntry.id).toBe("002");
      expect(claimedEntry.status).toBe("claimed");
      expect(claimedEntry.assignee).toBe("agent-1");
    }
  });

  it("discovers tasks by directory listing (no task list in index)", () => {
    expect(output.items.length).toBeGreaterThanOrEqual(1);
    const foundation = output.items.find((i) => i.slug === "001-chore-project-foundation");
    expect(foundation).toBeDefined();
    expect(foundation!.tasks).toHaveLength(2);
    expect(foundation!.tasks.map((r) => r.fileName).sort()).toEqual([
      "001-install-next-react-tailwind.md",
      "002-docker-setup.md",
    ]);
  });

  it("parses tasks with SPEC v4 metadata (task, dep, assignee, etc.)", () => {
    expect(output.tasks.length).toBeGreaterThanOrEqual(2);

    const t1 = output.tasks.find((t) => t.slug === "install-next-react-tailwind")!;
    expect(t1.name).toBe("Install Next.js, React and Tailwind");
    expect(t1.status).toBe("open");
    expect(t1.priority).toBe("1");
    expect(t1.dependsOn).toEqual([]);
    expect(t1.assignee).toBe("");
    expect(t1.requiresHumanReview).toBe(false);
    expect(t1.expiresAt).toBeNull();

    const t2 = output.tasks.find((t) => t.slug === "docker-setup")!;
    expect(t2.name).toBe("Docker setup");
    expect(t2.dependsOn).toContain("work/001-chore-project-foundation/001-install-next-react-tailwind.md");
  });

  it("has no validation errors", () => {
    expect(output.validation.errors).toHaveLength(0);
  });

  it("parses item assignee when status is claimed", () => {
    const claimed = output.items.find((i) => i.slug === "002-feat-claimed-item");
    if (claimed) {
      expect(claimed.status).toBe("claimed");
      expect(claimed.assignee).toBe("agent-1");
    }
  });

  it("serializes to valid JSON", () => {
    const json = JSON.parse(serializeOutput(output));
    expect(json.protocol).toBeDefined();
    expect(json.entries).toBeDefined();
    expect(json.items).toBeDefined();
    expect(json.tasks).toBeDefined();
  });
});
