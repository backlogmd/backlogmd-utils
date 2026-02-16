import fs from "node:fs";
import path from "node:path";
import { parseItemIndex } from "./parse-item-index.js";
import { parseTaskFile } from "./parse-task-file.js";
import { crossLink } from "./cross-link.js";
import type {
  BacklogOutput,
  BacklogEntry,
  ItemFolder,
  Task,
  TaskRef,
  ValidationIssue,
  BacklogmdDocument,
  WorkItem,
} from "./types.js";

/** SPEC v4: task files are <tid>-<slug>.md (tid = 3+ digits). Exclude index.md and *-feedback.md. */
function discoverTaskFilesFromDir(itemDir: string): TaskRef[] {
  if (!fs.existsSync(itemDir)) return [];
  const refs: TaskRef[] = [];
  const entries = fs.readdirSync(itemDir);
  const taskFilePattern = /^(\d{3,}-.+)\.md$/;
  for (const name of entries) {
    if (name === "index.md") continue;
    if (name.endsWith("-feedback.md")) continue;
    const match = name.match(taskFilePattern);
    if (match) {
      refs.push({ slug: match[1], fileName: name });
    }
  }
  return refs.sort((a, b) => a.fileName.localeCompare(b.fileName));
}

/**
 * Run the full pipeline: read from rootDir/work/, parse item index and task files,
 * cross-link, and return the canonical BacklogOutput object.
 *
 * Latest SPEC: work items are discovered only from the work/ directory.
 * Individual parse errors are collected as validation errors rather than throwing.
 */
export function buildBacklogOutput(rootDir: string): BacklogOutput {
  const absRoot = path.resolve(rootDir);
  const parseErrors: ValidationIssue[] = [];

  // 1. Discover and parse item folders from work/
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

      // SPEC v4: discover tasks by listing dir for <tid>-<slug>.md (no task list in index)
      if (folder.tasks.length === 0) {
        folder.tasks = discoverTaskFilesFromDir(itemDir);
      }

      itemFolders.push(folder);

      // 3. Parse task files (from index list or from directory listing)
      for (const ref of folder.tasks) {
        let taskPath = path.join(itemDir, ref.fileName);
        if (!fs.existsSync(taskPath) && !ref.fileName.endsWith(".md")) {
          const withMd = path.join(itemDir, `${ref.fileName}.md`);
          if (fs.existsSync(withMd)) taskPath = withMd;
        }
        if (!fs.existsSync(taskPath)) continue;

        const taskFileName = path.basename(taskPath);
        const taskSource = `work/${slug}/${taskFileName}`;

        try {
          const taskContent = fs.readFileSync(taskPath, "utf-8");
          const task = parseTaskFile(taskContent, slug, taskSource);

          // New SPEC: optional task feedback file (001-setup.md → 001-setup-feedback.md)
          const taskStem = path.basename(taskFileName, ".md");
          const feedbackFileName = `${taskStem}-feedback.md`;
          const feedbackSource = `work/${slug}/${feedbackFileName}`;
          const feedbackPath = path.join(itemDir, feedbackFileName);
          if (fs.existsSync(feedbackPath)) {
            const feedbackContent = fs.readFileSync(feedbackPath, "utf-8");
            task.feedback = { source: feedbackSource, content: feedbackContent };
          }

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

  // Entries are derived from discovered work items (one per item folder)
  const entries: BacklogEntry[] = itemFolders.map((f) => ({
    id: f.id,
    slug: f.slug,
    type: f.type,
    status: f.status,
    assignee: f.assignee,
    source: f.source,
  }));

  // 2. Cross-link
  const linkResult = crossLink(entries, itemFolders, tasks);

  // 3. Build output — merge parse errors with cross-link errors
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
 * Build a BacklogmdDocument from a root directory.
 *
 * Reads work/ only. Returns the document with work items and tasks.
 * Supports HTML comment and YAML frontmatter task file formats, and optional task feedback files.
 */
export function buildBacklogmdDocument(rootDir: string): BacklogmdDocument {
  const output = buildBacklogOutput(rootDir);
  const work: WorkItem[] = output.items.map((item) => ({
    slug: item.slug,
    type: item.type,
    tasks: item.tasks,
    source: item.source,
  }));
  return {
    protocol: output.protocol,
    generatedAt: output.generatedAt,
    rootDir: output.rootDir,
    work,
    tasks: output.tasks,
    validation: output.validation,
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
