import { describe, it, expect } from "vitest";
import path from "node:path";
import { parseBacklog, getTask, getWorkContext } from "@backlogmd/workers";

const FIXTURES = path.resolve(__dirname, "fixtures");
const SPEC_V4 = path.join(FIXTURES, "spec-v4");

describe("Worker", () => {
    describe("parseBacklog", () => {
        it("parses the current backlog and returns a BacklogmdDocument", () => {
            const doc = parseBacklog(SPEC_V4);

            expect(doc).toHaveProperty("items");
            expect(doc).toHaveProperty("tasks");
            expect(doc).toHaveProperty("rootDir");
            expect(Array.isArray(doc.items)).toBe(true);
            expect(Array.isArray(doc.tasks)).toBe(true);
        });

        it("parses work items and tasks from spec-v4 fixture", () => {
            const doc = parseBacklog(SPEC_V4);

            expect(doc.items.length).toBeGreaterThanOrEqual(1);
            expect(doc.items[0].slug).toBe("001-chore-project-foundation");
            expect(doc.tasks.length).toBeGreaterThanOrEqual(2);
            const installTask = doc.tasks.find((t) => t.slug === "install-next-react-tailwind");
            expect(installTask).toBeDefined();
            expect(installTask!.name).toBe("Install Next.js, React and Tailwind");
            expect(installTask!.itemSlug).toBe("001-chore-project-foundation");
        });
    });

    describe("getTask", () => {
        it("returns the task when given priority (e.g. 1)", () => {
            const doc = parseBacklog(SPEC_V4);
            const task = getTask(doc, "1");

            expect(task).toBeDefined();
            expect(task!.priority).toBe("1");
            expect(task!.name).toBe("Install Next.js, React and Tailwind");
            expect(task!.itemSlug).toBe("001-chore-project-foundation");
        });

        it("returns the task when given task ref slug (e.g. 001-install-next-react-tailwind)", () => {
            const doc = parseBacklog(SPEC_V4);
            const task = getTask(doc, "001-install-next-react-tailwind");

            expect(task).toBeDefined();
            expect(task!.name).toBe("Install Next.js, React and Tailwind");
            expect(task!.source).toBe(
                "work/001-chore-project-foundation/001-install-next-react-tailwind.md",
            );
        });

        it("returns the task when given itemSlug/priority (e.g. 001-chore-project-foundation/1)", () => {
            const doc = parseBacklog(SPEC_V4);
            const task = getTask(doc, "001-chore-project-foundation/1");

            expect(task).toBeDefined();
            expect(task!.itemSlug).toBe("001-chore-project-foundation");
            expect(task!.priority).toBe("1");
        });

        it("returns undefined when taskId does not match any task", () => {
            const doc = parseBacklog(SPEC_V4);

            expect(getTask(doc, "999")).toBeUndefined();
            expect(getTask(doc, "nonexistent")).toBeUndefined();
        });
    });

    describe("getWorkContext", () => {
        it("returns the work item that contains the task", () => {
            const doc = parseBacklog(SPEC_V4);
            const work = getWorkContext(doc, "1");

            expect(work).toBeDefined();
            expect(work!.slug).toBe("001-chore-project-foundation");
            expect(work!.type).toBe("chore");
            expect(work!.source).toBe("work/001-chore-project-foundation/index.md");
            expect(work!.tasks.length).toBeGreaterThanOrEqual(2);
            const ref = work!.tasks.find(
                (t) => t.fileName === "001-install-next-react-tailwind.md",
            );
            expect(ref).toBeDefined();
            expect(ref!.slug).toBe("001-install-next-react-tailwind");
        });

        it("returns the same work context when resolving by task slug", () => {
            const doc = parseBacklog(SPEC_V4);
            const workByPriority = getWorkContext(doc, "1");
            const workBySlug = getWorkContext(doc, "001-install-next-react-tailwind");

            expect(workByPriority).toBeDefined();
            expect(workBySlug).toEqual(workByPriority);
        });

        it("returns undefined when taskId does not match any task", () => {
            const doc = parseBacklog(SPEC_V4);

            expect(getWorkContext(doc, "999")).toBeUndefined();
            expect(getWorkContext(doc, "nonexistent")).toBeUndefined();
        });
    });
});
