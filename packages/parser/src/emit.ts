import fs from "node:fs";
import path from "node:path";
import { parseBacklog } from "./parse-backlog.js";
import { parseFeatureIndex } from "./parse-feature-index.js";
import { parseTaskFile } from "./parse-task-file.js";
import { crossLink } from "./cross-link.js";
import type { BacklogOutput, FeatureFolder, RoadmapFeature, Task } from "./types.js";

/**
 * Serialize a RoadmapFeature to the canonical JSON shape.
 */
function serializeFeature(f: RoadmapFeature) {
  return {
    id: f.id,
    name: f.name,
    statusDeclared: f.status,
    statusDerived: f.statusDerived,
    slug: f.featureSlug,
    description: f.description,
    tasks: f.taskRefs,
    source: f.source,
  };
}

/**
 * Serialize a FeatureFolder to the canonical JSON shape.
 */
function serializeFeatureFolder(ff: FeatureFolder) {
  return {
    slug: ff.slug,
    name: ff.name,
    status: ff.status,
    goal: ff.goal,
    tasks: ff.tasks.map((t) => t.priority),
    source: ff.source,
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
    featureId: t.featureId,
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
  const features = parseBacklog(backlogContent, "backlog.md");

  // 2. Discover and parse feature folders
  const featuresDir = path.join(absRoot, "features");
  const featureFolders: FeatureFolder[] = [];
  const tasks: Task[] = [];

  if (fs.existsSync(featuresDir)) {
    const slugs = fs.readdirSync(featuresDir).filter((entry) => {
      const fullPath = path.join(featuresDir, entry);
      return fs.statSync(fullPath).isDirectory() && !entry.startsWith(".");
    });

    for (const slug of slugs) {
      const featureDir = path.join(featuresDir, slug);
      const indexPath = path.join(featureDir, "index.md");

      if (!fs.existsSync(indexPath)) continue;

      const indexContent = fs.readFileSync(indexPath, "utf-8");
      const indexSource = `features/${slug}/index.md`;
      const folder = parseFeatureIndex(indexContent, slug, indexSource);
      featureFolders.push(folder);

      // 3. Parse task files listed in the feature index
      for (const stub of folder.tasks) {
        const taskPath = path.join(featureDir, stub.fileName);
        if (!fs.existsSync(taskPath)) continue;

        const taskContent = fs.readFileSync(taskPath, "utf-8");
        const taskSource = `features/${slug}/${stub.fileName}`;
        const task = parseTaskFile(taskContent, slug, taskSource);
        tasks.push(task);
      }
    }
  }

  // 4. Cross-link
  const linkResult = crossLink(features, featureFolders, tasks);

  // 5. Build output
  return {
    protocol: "backlogmd/v1",
    generatedAt: new Date().toISOString(),
    rootDir: absRoot,
    features: linkResult.features,
    featureFolders,
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
    features: output.features.map(serializeFeature),
    featureFolders: output.featureFolders.map(serializeFeatureFolder),
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
