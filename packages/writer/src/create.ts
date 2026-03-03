/**
 * Create and remove work items and tasks (SPEC v4).
 * Uses parser to read current state; writes new files or deletes existing ones.
 */
import fs from "node:fs";
import path from "node:path";
import type { ItemType, TaskStatus } from "@backlogmd/types";
import { buildBacklogOutput } from "@backlogmd/parser";

function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

/** Slug must be a single directory name (no path separators). */
function toSafeItemSlugSegment(str: string): string {
  return toKebabCase(str)
    .replace(/[/\\]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getNextItemId(rootDir: string): string {
  const workDir = path.join(path.resolve(rootDir), "work");
  if (!fs.existsSync(workDir)) return "001";
  const entries = fs.readdirSync(workDir, { withFileTypes: true });
  let maxId = 0;
  const numPrefix = /^(\d+)/;
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const m = e.name.match(numPrefix);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > maxId) maxId = n;
    }
  }
  return String(maxId + 1).padStart(3, "0");
}

/** Escape a string for use as a double-quoted YAML value. */
function yamlQuoted(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
}

/** SPEC v4 work item index.md: METADATA (work:, status:), DESCRIPTION, CONTEXT. Folder must contain only this file. */
function renderItemIndexV4(workTitle: string, status: string, description = "", context = ""): string {
  return `<!-- METADATA -->

\`\`\`yaml
work: ${yamlQuoted(workTitle)}
status: ${status}
\`\`\`

<!-- DESCRIPTION -->

${description || "(no description)"}

<!-- CONTEXT -->

${context || "(empty)"}
`;
}

/** SPEC v4 task file: task:, status:, priority:, dep:, assignee:, requiresHumanReview:, expiresAt:. */
function renderTaskFileV4(options: {
  task: string;
  status: TaskStatus;
  priority: number;
  dep?: string[];
  assignee?: string;
  requiresHumanReview?: boolean;
  expiresAt?: string | null;
}): string {
  const {
    task,
    status,
    priority,
    dep = [],
    assignee = "",
    requiresHumanReview = false,
    expiresAt = null,
  } = options;
  const depStr =
    dep.length > 0 ? `dep: [${dep.map((d) => `"${d}"`).join(", ")}]` : "dep: []";
  return `<!-- METADATA -->

\`\`\`yaml
task: ${task}
status: ${status}
priority: ${priority}
${depStr}
assignee: "${assignee}"
requiresHumanReview: ${requiresHumanReview}
expiresAt: ${expiresAt}
\`\`\`

<!-- /METADATA -->

<!-- DESCRIPTION -->

## Description



<!-- ACCEPTANCE -->

## Acceptance criteria

- [ ] 

`;
}

/**
 * Create a new work item (SPEC v4). Creates only work/<slug>/ with a single index.md
 * containing METADATA (work:, status:), DESCRIPTION, and CONTEXT. No task files.
 * Returns the new item slug and path.
 */
export function createWorkItem(
  rootDir: string,
  title: string,
  type?: ItemType,
  options?: { description?: string; context?: string },
): { slug: string; path: string } {
  const absRoot = path.resolve(rootDir);
  const nextId = getNextItemId(absRoot);
  const slug = `${nextId}${type ? `-${type}` : ""}-${toSafeItemSlugSegment(title)}`;
  const itemPath = `work/${slug}`;
  const absDir = path.join(absRoot, itemPath);
  fs.mkdirSync(absDir, { recursive: true });
  const description = options?.description?.trim() ?? "";
  const context = options?.context?.trim() ?? "";
  const content = renderItemIndexV4(title, "open", description, context);
  fs.writeFileSync(path.join(absDir, "index.md"), content, "utf-8");
  return { slug, path: itemPath };
}

/**
 * Create a new task under an existing work item (SPEC v4). Uses parser to find item and next task number.
 */
export function createTask(
  rootDir: string,
  itemSlug: string,
  title: string,
  options?: { status?: TaskStatus; tid?: string },
): { taskSource: string } {
  const absRoot = path.resolve(rootDir);
  const output = buildBacklogOutput(absRoot);
  const item = output.items.find(
    (i) => i.slug === itemSlug || i.slug.split("-")[0] === itemSlug,
  );
  if (!item) throw new Error(`Item "${itemSlug}" not found`);
  const tasksForItem = output.tasks.filter((t) => t.itemSlug === item.slug);
  const nextNum = options?.tid
    ? parseInt(options.tid, 10)
    : tasksForItem.length + 1;
  const nextTid = String(nextNum).padStart(3, "0");
  const slug = `${nextTid}-${toSafeItemSlugSegment(title)}`;
  const fileName = `${slug}.md`;
  const taskSource = `${item.source.replace("/index.md", "")}/${fileName}`;
  const taskPath = path.join(absRoot, taskSource);
  const content = renderTaskFileV4({
    task: title,
    status: options?.status ?? "open",
    priority: tasksForItem.length + 1,
  });
  fs.writeFileSync(taskPath, content, "utf-8");
  return { taskSource };
}

/**
 * Remove a work item and its directory (SPEC v4). Uses parser to resolve slug to path.
 */
export function removeWorkItem(rootDir: string, itemSlug: string): void {
  const output = buildBacklogOutput(path.resolve(rootDir));
  const item = output.items.find(
    (i) => i.slug === itemSlug || i.slug.split("-")[0] === itemSlug,
  );
  if (!item) throw new Error(`Item "${itemSlug}" not found`);
  const itemDir = path.dirname(path.join(path.resolve(rootDir), item.source));
  if (fs.existsSync(itemDir)) {
    fs.rmSync(itemDir, { recursive: true, force: true });
  }
}

/**
 * Remove a task file (SPEC v4). Uses parser to resolve taskId to task source path.
 */
export function removeTaskFile(rootDir: string, taskId: string): void {
  const output = buildBacklogOutput(path.resolve(rootDir));
  const task = output.tasks.find(
    (t) =>
      t.source === taskId ||
      t.slug === taskId ||
      `${t.itemSlug}/${t.priority}` === taskId ||
      `${t.itemSlug}/${t.slug.split("-")[0]}` === taskId,
  );
  if (!task) throw new Error(`Task "${taskId}" not found`);
  const taskPath = path.join(path.resolve(rootDir), task.source);
  if (fs.existsSync(taskPath)) fs.unlinkSync(taskPath);
}
