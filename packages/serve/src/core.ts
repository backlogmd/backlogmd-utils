import { BacklogCore } from "@backlogmd/core";
import type { Manifest, BacklogOutput } from "@backlogmd/types";
import path from "node:path";

export interface ServerContext {
  backlogDir: string;
  absBacklogDir: string;
}

export class CoreManager {
  private coreInstance: BacklogCore | null = null;
  private currentBacklogDir: string | null = null;

  async getCore(backlogDir: string): Promise<BacklogCore> {
    let dir = backlogDir;
    if (!dir.endsWith(".backlogmd")) {
      dir = path.join(dir, ".backlogmd");
    }

    if (!this.coreInstance || this.currentBacklogDir !== dir) {
      this.currentBacklogDir = dir;
      this.coreInstance = await BacklogCore.load({ rootDir: dir });
    }
    return this.coreInstance;
  }

  async reloadCore(): Promise<void> {
    if (this.currentBacklogDir) {
      this.coreInstance = await BacklogCore.load({ rootDir: this.currentBacklogDir });
    }
  }
}

export async function getCore(manager: CoreManager, backlogDir: string): Promise<BacklogCore> {
  return manager.getCore(backlogDir);
}

export async function reloadCore(manager: CoreManager): Promise<void> {
  return manager.reloadCore();
}

export function manifestToOutput(manifest: Manifest, rootDir: string): BacklogOutput {
  const entries = manifest.items
    .filter((item) => item.status === "open")
    .map((item) => ({
      slug: item.slug,
      type: null,
      source: `${item.path}/index.md`,
    }));

  return {
    protocol: "backlogmd/v3",
    generatedAt: new Date().toISOString(),
    rootDir,
    manifest,
    entries,
    items: manifest.items.map((item) => ({
      slug: item.slug,
      type: null,
      tasks: item.tasks.map((t) => ({
        slug: t.slug,
        fileName: t.file,
      })),
      source: `${item.path}/index.md`,
    })),
    tasks: manifest.items.flatMap((item) =>
      item.tasks.map((t) => ({
        name: t.t,
        status: t.s,
        priority: t.p,
        tid: t.tid,
        slug: t.slug.replace(/^\d+-/, ""),
        itemSlug: item.slug,
        dependsOn: t.dep,
        agent: t.a,
        humanReview: t.h,
        expiresAt: t.expiresAt,
        description: "",
        acceptanceCriteria: [],
        source: `${item.path}/${t.file}`,
      })),
    ),
    validation: { errors: [], warnings: [] },
  };
}

export function errorOutput(backlogDir: string, message: string): BacklogOutput {
  return {
    protocol: "backlogmd/v3",
    generatedAt: new Date().toISOString(),
    rootDir: backlogDir,
    manifest: null,
    entries: [],
    items: [],
    tasks: [],
    validation: {
      errors: [
        {
          code: "FATAL_LOAD_ERROR",
          message,
          source: "",
        },
      ],
      warnings: [],
    },
  };
}

export const VALID_STATUSES: Set<string> = new Set([
  "plan",
  "open",
  "reserved",
  "ip",
  "review",
  "block",
  "done",
]);
