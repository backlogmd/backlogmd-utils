import fs from "node:fs";
import path from "node:path";
import { parseBacklog } from "./parse-backlog.js";
import { parseItemIndex } from "./parse-item-index.js";
import { parseTaskFile } from "./parse-task-file.js";
import { crossLink } from "./cross-link.js";
import type { BacklogOutput, BacklogEntry, ItemFolder, Task, ValidationIssue } from "./types.js";

/**
 * Run the full pipeline: read files from rootDir, parse, cross-link, and return
 * the canonical BacklogOutput object.
 *
 * SPEC v2: reads from work/ directory (not items/).
 *
 * Individual parse errors are collected as validation errors rather than
 * throwing — a malformed task file won't prevent the rest of the backlog
 * from being parsed.
 */
export function buildBacklogOutput(rootDir: string): BacklogOutput {
  const absRoot = path.resolve(rootDir);
  const parseErrors: ValidationIssue[] = [];

  // 1. Parse backlog.md
  let entries: BacklogEntry[] = [];
  const backlogPath = path.join(absRoot, "backlog.md");

  try {
    const backlogContent = fs.readFileSync(backlogPath, "utf-8");
    entries = parseBacklog(backlogContent, "backlog.md");
  } catch (err) {
    parseErrors.push({
      code: "BACKLOG_PARSE_ERROR",
      message: `Failed to parse backlog.md: ${(err as Error).message}`,
      source: "backlog.md",
    });
  }

  // 2. Discover and parse item folders from work/
  const workDir = path.join(absRoot, "work");
  const itemFolders: ItemFolder[] = [];
  const tasks: Task[] = [];

  if (fs.existsSync(workDir)) {
    const slugs = fs.readdirSync(workDir).filter((entry) => {
      const fullPath = path.join(workDir, entry);
      return fs.statSync(fullPath).isDirectory() && !entry.startsWith(".");
    });

    for (const slug of slugs) {
      const itemDir = path.join(workDir, slug);
      const indexPath = path.join(itemDir, "index.md");

      if (!fs.existsSync(indexPath)) continue;

      const indexSource = `work/${slug}/index.md`;
      let folder: ItemFolder;

      try {
        const indexContent = fs.readFileSync(indexPath, "utf-8");
        folder = parseItemIndex(indexContent, slug, indexSource);
      } catch (err) {
        parseErrors.push({
          code: "INDEX_PARSE_ERROR",
          message: `Failed to parse ${indexSource}: ${(err as Error).message}`,
          source: indexSource,
        });
        continue;
      }

      itemFolders.push(folder);

      // 3. Parse task files listed in the item index
      for (const ref of folder.tasks) {
        const taskPath = path.join(itemDir, ref.fileName);
        if (!fs.existsSync(taskPath)) continue;

        const taskSource = `work/${slug}/${ref.fileName}`;

        try {
          const taskContent = fs.readFileSync(taskPath, "utf-8");
          const task = parseTaskFile(taskContent, slug, taskSource);
          tasks.push(task);
        } catch (err) {
          parseErrors.push({
            code: "TASK_PARSE_ERROR",
            message: `Failed to parse ${taskSource}: ${(err as Error).message}`,
            source: taskSource,
          });
        }
      }
    }
  }

  // 4. Cross-link
  const linkResult = crossLink(entries, itemFolders, tasks);

  // 5. Build output — merge parse errors with cross-link errors
  return {
    protocol: "backlogmd/v2",
    generatedAt: new Date().toISOString(),
    rootDir: absRoot,
    entries: linkResult.entries,
    items: itemFolders,
    tasks,
    validation: {
      errors: [...parseErrors, ...linkResult.errors],
      warnings: linkResult.warnings,
    },
  };
}

/**
 * Serialize a BacklogOutput to the canonical JSON string.
 */
export function serializeOutput(output: BacklogOutput): string {
  return JSON.stringify(output, null, 2);
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
