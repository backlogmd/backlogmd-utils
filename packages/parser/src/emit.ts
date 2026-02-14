import fs from "node:fs";
import path from "node:path";
import { parseBacklog } from "./parsers/parseBacklog.js";
import { parseItemIndex } from "./parsers/parseItemIndex.js";
import { parseTaskFile } from "./parsers/parseTaskFile.js";
import { crossLink } from "./crossLink.js";
import { parseManifest } from "./parsers/parseManifest.js";
import type {
  BacklogOutput,
  BacklogEntry,
  ItemFolder,
  Task,
  Manifest,
  ValidationIssue,
} from "./types.js";

/**
 * Run the full pipeline: read files from rootDir, parse, cross-link, and return
 * the canonical BacklogOutput object.
 *
 * SPEC v3: reads from work/ directory, optionally reads manifest.json.
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

  // 2. Parse manifest.json (optional)
  let manifest: Manifest | null = null;
  const manifestWarnings: ValidationIssue[] = [];
  const manifestPath = path.join(absRoot, "manifest.json");
  if (fs.existsSync(manifestPath)) {
    try {
      const manifestContent = fs.readFileSync(manifestPath, "utf-8");
      const result = parseManifest(manifestContent, "manifest.json");
      manifest = result.manifest;
      manifestWarnings.push(...result.warnings);
    } catch (err) {
      parseErrors.push({
        code: "MANIFEST_PARSE_ERROR",
        message: `Failed to parse manifest.json: ${(err as Error).message}`,
        source: "manifest.json",
      });
    }
  }

  // 3. Discover and parse item folders from work/
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

      // 4. Parse task files listed in the item index
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

  // 5. Cross-link
  const linkResult = crossLink(entries, itemFolders, tasks);

  // 6. Build output — merge parse errors with cross-link errors
  return {
    protocol: "backlogmd/v3",
    generatedAt: new Date().toISOString(),
    rootDir: absRoot,
    entries: linkResult.entries,
    items: itemFolders,
    tasks,
    manifest,
    validation: {
      errors: [...parseErrors, ...linkResult.errors],
      warnings: [...linkResult.warnings, ...manifestWarnings],
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
export function writeOutput(
  output: BacklogOutput,
  outputPath?: string,
): string {
  const json = serializeOutput(output);
  if (outputPath) {
    fs.writeFileSync(outputPath, json, "utf-8");
  }
  return json;
}
