import { describe, it, expect } from "vitest";
import path from "node:path";
import { buildBacklogmdDocument } from "@backlogmd/parser";

const FIXTURES = path.resolve(__dirname, "fixtures");

function expectValidationIssueShape(issue: { code: string; message: string; source: string }) {
  expect(issue).toHaveProperty("code");
  expect(issue).toHaveProperty("message");
  expect(issue).toHaveProperty("source");
  expect(typeof issue.code).toBe("string");
  expect(typeof issue.message).toBe("string");
  expect(typeof issue.source).toBe("string");
}

describe("BacklogmdDocument (spec-v4)", () => {
  describe("spec-v4 fixture (SPEC v4 – task discovery by dir listing)", () => {
    const doc = buildBacklogmdDocument(path.join(FIXTURES, "spec-v4"));

    it("returns a BacklogmdDocument with work and tasks", () => {
      expect(doc).toHaveProperty("work");
      expect(doc).toHaveProperty("tasks");
      expect(doc).toHaveProperty("protocol");
      expect(doc).toHaveProperty("rootDir");
      expect(doc).toHaveProperty("validation");
    });

    it("parses work items from work/", () => {
      expect(doc.work.length).toBeGreaterThanOrEqual(1);
      const foundation = doc.work.find((w) => w.slug === "001-chore-project-foundation");
      expect(foundation).toBeDefined();
      expect(foundation!.source).toBe("work/001-chore-project-foundation/index.md");
      expect(foundation!.tasks).toHaveLength(2);
      expect(foundation!.tasks.map((t) => t.fileName).sort()).toEqual([
        "001-install-next-react-tailwind.md",
        "002-docker-setup.md",
      ]);
    });

    it("parses task files with SPEC v4 metadata", () => {
      expect(doc.tasks.length).toBeGreaterThanOrEqual(2);
      const task = doc.tasks.find((t) => t.slug === "install-next-react-tailwind");
      expect(task).toBeDefined();
      expect(task!.name).toBe("Install Next.js, React and Tailwind");
      expect(task!.status).toBe("open");
      expect(task!.priority).toBe("1");
      expect(task!.itemSlug).toBe("001-chore-project-foundation");
      expect(task!.dependsOn).toEqual([]);
    });

    it("has no validation errors", () => {
      expect(doc.validation.errors).toHaveLength(0);
    });

    it("exposes validation feedback with correct shape (no errors)", () => {
      expect(Array.isArray(doc.validation.errors)).toBe(true);
      expect(Array.isArray(doc.validation.warnings)).toBe(true);
      doc.validation.errors.forEach(expectValidationIssueShape);
      doc.validation.warnings.forEach(expectValidationIssueShape);
    });
  });

  describe("empty root (validation-errors fixture: no work/)", () => {
    const doc = buildBacklogmdDocument(path.join(FIXTURES, "validation-errors"));

    it("has empty work and tasks when root has no work directory", () => {
      expect(doc.work).toHaveLength(0);
      expect(doc.tasks).toHaveLength(0);
    });

    it("has no validation errors or warnings", () => {
      expect(doc.validation.errors).toHaveLength(0);
      expect(doc.validation.warnings).toHaveLength(0);
    });
  });
});
