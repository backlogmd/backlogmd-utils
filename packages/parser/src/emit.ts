import fs from "node:fs";
import path from "node:path";
import { parseBacklog } from "./parse-backlog.js";
import { parseItemIndex } from "./parse-item-index.js";
import { parseTaskFile } from "./parse-task-file.js";
import { crossLink } from "./cross-link.js";
import type { BacklogOutput, ItemFolder, RoadmapItem, Task } from "./types.js";

/**
 * Serialize a RoadmapItem to the canonical JSON shape.
 */
function serializeItem(item: RoadmapItem) {
  return {
    id: item.id,
    name: item.name,
    type: item.type,
    statusDeclared: item.status,
    statusDerived: item.statusDerived,
    slug: item.itemSlug,
    description: item.description,
    tasks: item.taskRefs,
    source: item.source,
  };
}

/**
 * Serialize an ItemFolder to the canonical JSON shape.
 */
function serializeItemFolder(folder: ItemFolder) {
  return {
    slug: folder.slug,
    name: folder.name,
    type: folder.type,
    status: folder.status,
    goal: folder.goal,
    tasks: folder.tasks.map((t) => t.priority),
    source: folder.source,
  };
}

/**
 * Serialize a Task to the canonical JSON shape.
 */
function serializeTask(t: Task) {
  return {
    id: t.id,
    slug: t.slug,
    name: t.name,
    status: t.status,
    priority: t.priority,
    owner: t.owner,
    itemId: t.itemId,
    dependsOn: t.dependsOn,
    blocks: t.blocks,
    description: t.description,
    acceptanceCriteria: t.acceptanceCriteria,
    source: t.source,
  };
}

/**
 * Run the full pipeline: read files from rootDir, parse, cross-link, and return
 * the canonical BacklogOutput object.
 */
export function buildBacklogOutput(rootDir: string): BacklogOutput {
  const absRoot = path.resolve(rootDir);

  // 1. Parse backlog.md
  const backlogPath = path.join(absRoot, "backlog.md");
  const backlogContent = fs.readFileSync(backlogPath, "utf-8");
  const items = parseBacklog(backlogContent, "backlog.md");

  // 2. Discover and parse item folders
  const itemsDir = path.join(absRoot, "items");
  const itemFolders: ItemFolder[] = [];
  const tasks: Task[] = [];

  if (fs.existsSync(itemsDir)) {
    const slugs = fs.readdirSync(itemsDir).filter((entry) => {
      const fullPath = path.join(itemsDir, entry);
      return fs.statSync(fullPath).isDirectory() && !entry.startsWith(".");
    });

    for (const slug of slugs) {
      const itemDir = path.join(itemsDir, slug);
      const indexPath = path.join(itemDir, "index.md");

      if (!fs.existsSync(indexPath)) continue;

      const indexContent = fs.readFileSync(indexPath, "utf-8");
      const indexSource = `items/${slug}/index.md`;
      const folder = parseItemIndex(indexContent, slug, indexSource);
      itemFolders.push(folder);

      // 3. Parse task files listed in the item index
      for (const stub of folder.tasks) {
        const taskPath = path.join(itemDir, stub.fileName);
        if (!fs.existsSync(taskPath)) continue;

        const taskContent = fs.readFileSync(taskPath, "utf-8");
        const taskSource = `items/${slug}/${stub.fileName}`;
        const task = parseTaskFile(taskContent, slug, taskSource);
        tasks.push(task);
      }
    }
  }

  // 4. Cross-link
  const linkResult = crossLink(items, itemFolders, tasks);

  // 5. Build output
  return {
    protocol: "backlogmd/v1",
    generatedAt: new Date().toISOString(),
    rootDir: absRoot,
    items: linkResult.items,
    itemFolders,
    tasks,
    validation: {
      errors: linkResult.errors,
      warnings: linkResult.warnings,
    },
  };
}

/**
 * Serialize a BacklogOutput to the canonical JSON string.
 */
export function serializeOutput(output: BacklogOutput): string {
  const json = {
    protocol: output.protocol,
    generatedAt: output.generatedAt,
    rootDir: output.rootDir,
    items: output.items.map(serializeItem),
    itemFolders: output.itemFolders.map(serializeItemFolder),
    tasks: output.tasks.map(serializeTask),
    validation: output.validation,
  };
  return JSON.stringify(json, null, 2);
}

/**
 * Write the output to a file or return as string.
 */
export function writeOutput(output: BacklogOutput, outputPath?: string): string {
  const json = serializeOutput(output);
  if (outputPath) {
    fs.writeFileSync(outputPath, json, "utf-8");
  }
  return json;
}
