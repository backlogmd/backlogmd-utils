import fs from "node:fs";
import path from "node:path";
import type { Manifest, ManifestItem, ManifestTask } from "@backlogmd/types";
import { buildBacklogOutput } from "@backlogmd/parser";

const MANIFEST_PATH = "manifest.json";

export function readManifest(rootDir: string): Manifest | null {
  const manifestPath = path.join(rootDir, MANIFEST_PATH);
  if (!fs.existsSync(manifestPath)) {
    return null;
  }
  const content = fs.readFileSync(manifestPath, "utf-8");
  return JSON.parse(content) as Manifest;
}

export function writeManifest(rootDir: string, manifest: Manifest): void {
  const manifestPath = path.join(rootDir, MANIFEST_PATH);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
}

export function generateManifestFromFiles(rootDir: string): Manifest {
  const output = buildBacklogOutput(rootDir);
  const items: ManifestItem[] = output.items.map((folder) => {
    const tasks: ManifestTask[] = folder.tasks.map((ref) => {
      const task = output.tasks.find(
        (t) => t.itemSlug === folder.slug && t.tid === ref.slug.split("-")[0],
      );
      return {
        tid: ref.slug.split("-")[0],
        slug: ref.slug,
        file: ref.fileName,
        t: task?.name ?? ref.slug,
        s: task?.status ?? "open",
        p: task?.priority ?? 10,
        dep: task?.dependsOn ?? [],
        a: task?.agent ?? "",
        h: task?.humanReview ?? false,
        expiresAt: task?.expiresAt ?? null,
      };
    });

    return {
      id: folder.slug.split("-")[0],
      slug: folder.slug,
      path: `work/${folder.slug}`,
      status: "open",
      updated: new Date().toISOString(),
      tasks,
    };
  });

  return {
    specVersion: "3.0.0",
    updatedAt: new Date().toISOString(),
    openItemCount: items.filter((i) => i.status === "open").length,
    items,
  };
}

export function findTaskInManifest(
  manifest: Manifest,
  taskId: string,
): { item: ManifestItem; task: ManifestTask; itemIndex: number; taskIndex: number } | null {
  for (let i = 0; i < manifest.items.length; i++) {
    const item = manifest.items[i];
    for (let j = 0; j < item.tasks.length; j++) {
      const task = item.tasks[j];
      const taskSource = `${item.path}/${task.file}`;
      if (
        task.tid === taskId ||
        task.slug === taskId ||
        task.file === taskId ||
        taskSource === taskId
      ) {
        return { item, task, itemIndex: i, taskIndex: j };
      }
    }
  }
  return null;
}

export function findItemInManifest(
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
