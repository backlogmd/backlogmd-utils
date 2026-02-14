import fs from "node:fs";
import path from "node:path";
import type { Manifest, ManifestItem, ManifestTask, TaskStatus } from "@backlogmd/types";
import { findTaskInManifest } from "./manifestOps.js";

export interface TaskPatch {
  filePath: string;
  original: string;
  replacement: string;
}

export function patchTaskFile(
  rootDir: string,
  itemPath: string,
  task: ManifestTask,
  field: string,
  newValue: unknown,
): TaskPatch {
  const taskPath = path.join(rootDir, itemPath, task.file);
  const content = fs.readFileSync(taskPath, "utf-8");

  const patched = patchYamlField(content, field, newValue);
  fs.writeFileSync(taskPath, patched.patched, "utf-8");

  return {
    filePath: `${itemPath}/${task.file}`,
    original: patched.original,
    replacement: patched.replacement,
  };
}

function patchYamlField(
  content: string,
  field: string,
  newValue: unknown,
): { patched: string; original: string; replacement: string } {
  const metaStart = content.indexOf("<!-- METADATA -->");
  const descStart = content.indexOf("<!-- DESCRIPTION -->");

  if (metaStart === -1 || descStart === -1) {
    throw new Error("Invalid task file format");
  }

  const metaSection = content.slice(metaStart + "<!-- METADATA -->".length, descStart);
  const codeMatch = metaSection.match(/```(?:yaml)?\s*\n([\s\S]*?)```/);
  if (!codeMatch) {
    throw new Error("YAML block not found");
  }

  const yamlContent = codeMatch[1];
  const lines = yamlContent.split("\n");
  let originalLine = "";
  let newLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith(`${field}:`)) {
      const indent = line.match(/^(\s*)/)?.[1] ?? "";
      originalLine = line;
      if (typeof newValue === "string") {
        newLines.push(`${indent}${field}: ${newValue}`);
      } else if (newValue === null) {
        newLines.push(`${indent}${field}: null`);
      } else if (typeof newValue === "boolean") {
        newLines.push(`${indent}${field}: ${newValue}`);
      } else if (Array.isArray(newValue)) {
        newLines.push(`${indent}${field}: [${newValue.map((v) => `"${v}"`).join(", ")}]`);
      } else {
        newLines.push(`${indent}${field}: ${newValue}`);
      }
    } else {
      newLines.push(line);
    }
  }

  const newYamlContent = newLines.join("\n");
  const patchedSection = metaSection.replace(codeMatch[1], newYamlContent);
  const patched =
    content.slice(0, metaStart + "<!-- METADATA -->".length) +
    patchedSection +
    content.slice(descStart);

  return {
    patched,
    original: originalLine,
    replacement: newLines.find((l) => l.startsWith(`${field}:`)) ?? "",
  };
}

export function closeTask(
  rootDir: string,
  manifest: Manifest,
  taskId: string,
): { manifest: Manifest; patches: TaskPatch[] } {
  const found = findTaskInManifest(manifest, taskId);
  if (!found) {
    throw new Error(`Task "${taskId}" not found`);
  }

  const { item, task, itemIndex, taskIndex } = found;
  const patches: TaskPatch[] = [];

  manifest.items[itemIndex].tasks[taskIndex] = {
    ...task,
    s: "done",
  };
  manifest.items[itemIndex].updated = new Date().toISOString();

  const taskPatch = patchTaskFile(rootDir, item.path, task, "s", "done");
  patches.push(taskPatch);

  return { manifest, patches };
}

export function startTask(
  rootDir: string,
  manifest: Manifest,
  taskId: string,
): { manifest: Manifest; patches: TaskPatch[] } {
  const found = findTaskInManifest(manifest, taskId);
  if (!found) {
    throw new Error(`Task "${taskId}" not found`);
  }

  const { item, task, itemIndex, taskIndex } = found;
  const patches: TaskPatch[] = [];

  const newStatus: TaskStatus = task.h ? "review" : "ip";
  manifest.items[itemIndex].tasks[taskIndex] = {
    ...task,
    s: newStatus,
  };
  manifest.items[itemIndex].updated = new Date().toISOString();

  const taskPatch = patchTaskFile(rootDir, item.path, task, "s", newStatus);
  patches.push(taskPatch);

  return { manifest, patches };
}

export function updateTaskStatus(
  rootDir: string,
  manifest: Manifest,
  taskId: string,
  status: TaskStatus,
): { manifest: Manifest; patches: TaskPatch[] } {
  const found = findTaskInManifest(manifest, taskId);
  if (!found) {
    throw new Error(`Task "${taskId}" not found`);
  }

  const { item, task, itemIndex, taskIndex } = found;
  const patches: TaskPatch[] = [];

  manifest.items[itemIndex].tasks[taskIndex] = {
    ...task,
    s: status,
  };
  manifest.items[itemIndex].updated = new Date().toISOString();

  const taskPatch = patchTaskFile(rootDir, item.path, task, "s", status);
  patches.push(taskPatch);

  return { manifest, patches };
}

export function assignAgent(
  rootDir: string,
  manifest: Manifest,
  taskId: string,
  agentId: string,
): { manifest: Manifest; patches: TaskPatch[] } {
  const found = findTaskInManifest(manifest, taskId);
  if (!found) {
    throw new Error(`Task "${taskId}" not found`);
  }

  const { item, task, itemIndex, taskIndex } = found;
  const patches: TaskPatch[] = [];

  manifest.items[itemIndex].tasks[taskIndex] = {
    ...task,
    a: agentId,
  };
  manifest.items[itemIndex].updated = new Date().toISOString();

  const taskPatch = patchTaskFile(rootDir, item.path, task, "a", agentId);
  patches.push(taskPatch);

  return { manifest, patches };
}

export function addTask(
  rootDir: string,
  manifest: Manifest,
  itemSlug: string,
  title: string,
  tid?: string,
  status: "plan" | "open" | undefined = "open",
): { manifest: Manifest; newTask: ManifestTask } {
  const itemFound = findItemInManifest(manifest, itemSlug);
  if (!itemFound) {
    throw new Error(`Item "${itemSlug}" not found`);
  }

  const { item, index: itemIndex } = itemFound;

  const nextTid = tid ?? String(item.tasks.length + 1).padStart(3, "0");
  const slug = `${nextTid}-${toKebabCase(title)}`;

  const newTask: ManifestTask = {
    tid: nextTid,
    slug,
    file: `${slug}.md`,
    t: title,
    s: status,
    p: item.tasks.length * 5 + 5,
    dep: [],
    a: "",
    h: false,
    expiresAt: null,
  };

  manifest.items[itemIndex].tasks.push(newTask);
  manifest.items[itemIndex].updated = new Date().toISOString();
  manifest.updatedAt = new Date().toISOString();

  const taskContent = renderTaskFile(newTask);
  const taskPath = path.join(rootDir, "work", item.path, newTask.file);
  fs.writeFileSync(taskPath, taskContent, "utf-8");

  const indexContent = renderItemIndex(manifest.items[itemIndex]);
  const indexPath = path.join(rootDir, "work", item.path, "index.md");
  fs.writeFileSync(indexPath, indexContent, "utf-8");

  return { manifest, newTask };
}

export function removeTask(
  rootDir: string,
  manifest: Manifest,
  taskId: string,
): { manifest: Manifest } {
  const found = findTaskInManifest(manifest, taskId);
  if (!found) {
    throw new Error(`Task "${taskId}" not found`);
  }

  const { item, itemIndex, taskIndex } = found;

  const taskPath = path.join(rootDir, item.path, item.tasks[taskIndex].file);
  if (fs.existsSync(taskPath)) {
    fs.unlinkSync(taskPath);
  }

  manifest.items[itemIndex].tasks.splice(taskIndex, 1);
  manifest.items[itemIndex].updated = new Date().toISOString();
  manifest.updatedAt = new Date().toISOString();

  const indexContent = renderItemIndex(manifest.items[itemIndex]);
  const indexPath = path.join(rootDir, item.path, "index.md");
  fs.writeFileSync(indexPath, indexContent, "utf-8");

  return { manifest };
}

function findItemInManifest(
  manifest: Manifest,
  itemSlug: string,
): { item: ManifestItem; index: number } | null {
  for (let i = 0; i < manifest.items.length; i++) {
    if (manifest.items[i].slug === itemSlug || manifest.items[i].id === itemSlug) {
      return { item: manifest.items[i], index: i };
    }
  }
  return null;
}

function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

function renderTaskFile(task: ManifestTask): string {
  const depStr =
    task.dep.length > 0 ? `dep: [${task.dep.map((d) => `"${d}"`).join(", ")}]` : "dep: []";

  return `<!-- METADATA -->
\`\`\`yaml
t: ${task.t}
s: ${task.s}
p: ${task.p}
${depStr}
a: "${task.a}"
h: ${task.h}
expiresAt: ${task.expiresAt}
\`\`\`
<!-- DESCRIPTION -->

## Description



<!-- ACCEPTANCE -->

## Acceptance criteria

- [ ] 

`;
}

function renderItemIndex(item: ManifestItem): string {
  const lines = item.tasks.map((t) => `- [${t.slug}](${t.file})`);
  return lines.join("\n") + "\n";
}

export interface TaskContent {
  title: string;
  description: string;
  acceptanceCriteria: { text: string; checked: boolean }[];
}

export function getTaskContent(
  rootDir: string,
  manifest: Manifest,
  taskSource: string,
): TaskContent {
  const fileName = taskSource.split("/").pop() || taskSource;
  const found = findTaskInManifest(manifest, fileName);
  if (!found) {
    throw new Error(`Task "${taskSource}" not found`);
  }

  const { item, task } = found;
  const taskPath = path.join(rootDir, item.path, task.file);
  const content = fs.readFileSync(taskPath, "utf-8");

  const description = extractDescription(content);
  const acceptanceCriteria = extractAcceptanceCriteria(content);

  return {
    title: task.t,
    description,
    acceptanceCriteria,
  };
}

function extractDescription(content: string): string {
  const descStart = content.indexOf("<!-- DESCRIPTION -->");
  const acStart = content.indexOf("<!-- ACCEPTANCE -->");

  if (descStart === -1) return "";

  const descSection = content.slice(descStart + "<!-- DESCRIPTION -->".length, acStart);
  const lines = descSection.split("\n").filter((line) => !line.startsWith("## "));
  return lines
    .map((l) => l.trim())
    .join("\n")
    .trim();
}

function extractAcceptanceCriteria(content: string): { text: string; checked: boolean }[] {
  const acStart = content.indexOf("<!-- ACCEPTANCE -->");
  if (acStart === -1) return [];

  const acSection = content.slice(acStart + "<!-- ACCEPTANCE -->".length);
  const criteria: { text: string; checked: boolean }[] = [];
  const regex = /- \[([ x])\] (.+)/g;
  let match;

  while ((match = regex.exec(acSection)) !== null) {
    criteria.push({
      checked: match[1] === "x",
      text: match[2].trim(),
    });
  }

  return criteria;
}

export function updateTaskContent(
  rootDir: string,
  manifest: Manifest,
  taskSource: string,
  updates: Partial<TaskContent>,
): { manifest: Manifest; patches: TaskPatch[] } {
  const fileName = taskSource.split("/").pop() || taskSource;
  const found = findTaskInManifest(manifest, fileName);
  if (!found) {
    throw new Error(`Task "${taskSource}" not found`);
  }

  const { item, task, itemIndex, taskIndex } = found;
  const patches: TaskPatch[] = [];

  const taskPath = path.join(rootDir, item.path, task.file);
  let content = fs.readFileSync(taskPath, "utf-8");

  if (updates.title !== undefined) {
    content = patchYamlField(content, "t", updates.title).patched;
    manifest.items[itemIndex].tasks[taskIndex] = {
      ...task,
      t: updates.title,
    };
  }

  if (updates.description !== undefined) {
    content = patchDescription(content, updates.description);
  }

  if (updates.acceptanceCriteria !== undefined) {
    content = patchAcceptanceCriteria(content, updates.acceptanceCriteria);
  }

  fs.writeFileSync(taskPath, content, "utf-8");
  manifest.items[itemIndex].updated = new Date().toISOString();

  return { manifest, patches };
}

function patchDescription(content: string, newDescription: string): string {
  const descStart = content.indexOf("<!-- DESCRIPTION -->");
  const acStart = content.indexOf("<!-- ACCEPTANCE -->");

  if (descStart === -1 || acStart === -1) {
    return content;
  }

  const before = content.slice(0, descStart + "<!-- DESCRIPTION -->".length);
  const after = content.slice(acStart);

  return `${before}

## Description

${newDescription}

${after}`;
}

function patchAcceptanceCriteria(
  content: string,
  criteria: { text: string; checked: boolean }[],
): string {
  const acStart = content.indexOf("<!-- ACCEPTANCE -->");
  const endMarker = "<!-- /ACCEPTANCE -->";

  if (acStart === -1) {
    return content;
  }

  const endIdx = content.indexOf(endMarker, acStart);
  if (endIdx === -1) {
    return content;
  }

  const before = content.slice(0, acStart + "<!-- ACCEPTANCE -->".length);
  const after = content.slice(endIdx);

  const criteriaLines = criteria.map((c) => `- [${c.checked ? "x" : " "}] ${c.text}`).join("\n");

  return `${before}

## Acceptance criteria

${criteriaLines}
${after}`;
}
