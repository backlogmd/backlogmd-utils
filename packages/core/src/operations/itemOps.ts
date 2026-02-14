import fs from "node:fs";
import path from "node:path";
import type { Manifest, ManifestItem, ManifestItemStatus, ItemType } from "@backlogmd/types";

export function addItem(
  rootDir: string,
  manifest: Manifest,
  title: string,
  type?: ItemType,
): { manifest: Manifest; newItem: ManifestItem } {
  const nextId = String(manifest.items.length + 1).padStart(3, "0");
  const slug = `${nextId}${type ? `-${type}` : ""}-${toKebabCase(title)}`;

  const newItem: ManifestItem = {
    id: nextId,
    slug,
    path: `work/${slug}`,
    status: "open",
    updated: new Date().toISOString(),
    tasks: [],
  };

  manifest.items.push(newItem);
  manifest.openItemCount = manifest.items.filter((i) => i.status === "open").length;
  manifest.updatedAt = new Date().toISOString();

  const itemDir = path.join(rootDir, "work", slug);
  fs.mkdirSync(itemDir, { recursive: true });

  const indexContent = "";
  fs.writeFileSync(path.join(itemDir, "index.md"), indexContent, "utf-8");

  const backlogPath = path.join(rootDir, "backlog.md");
  let backlogContent = "";
  if (fs.existsSync(backlogPath)) {
    backlogContent = fs.readFileSync(backlogPath, "utf-8");
  }
  const entry = `- [${slug}](work/${slug}/index.md)\n`;
  if (!backlogContent.includes(entry)) {
    backlogContent += entry;
    fs.writeFileSync(backlogPath, backlogContent, "utf-8");
  }

  return { manifest, newItem };
}

export function removeItem(
  rootDir: string,
  manifest: Manifest,
  itemSlug: string,
): { manifest: Manifest } {
  const itemIndex = manifest.items.findIndex((i) => i.slug === itemSlug || i.id === itemSlug);
  if (itemIndex === -1) {
    throw new Error(`Item "${itemSlug}" not found`);
  }

  const item = manifest.items[itemIndex];
  const itemPath = path.join(rootDir, item.path);

  if (fs.existsSync(itemPath)) {
    fs.rmSync(itemPath, { recursive: true, force: true });
  }

  manifest.items.splice(itemIndex, 1);
  manifest.openItemCount = manifest.items.filter((i) => i.status === "open").length;
  manifest.updatedAt = new Date().toISOString();

  const backlogPath = path.join(rootDir, "backlog.md");
  if (fs.existsSync(backlogPath)) {
    let backlogContent = fs.readFileSync(backlogPath, "utf-8");
    backlogContent = backlogContent
      .split("\n")
      .filter((line) => !line.includes(`work/${item.slug}/index.md`))
      .join("\n");
    fs.writeFileSync(backlogPath, backlogContent, "utf-8");
  }

  return { manifest };
}

export function archiveItem(
  rootDir: string,
  manifest: Manifest,
  itemSlug: string,
): { manifest: Manifest } {
  const itemIndex = manifest.items.findIndex((i) => i.slug === itemSlug || i.id === itemSlug);
  if (itemIndex === -1) {
    throw new Error(`Item "${itemSlug}" not found`);
  }

  const item = manifest.items[itemIndex];
  const allDone = item.tasks.every((t) => t.s === "done");
  if (!allDone) {
    throw new Error(`Cannot archive item "${itemSlug}": not all tasks are done`);
  }

  manifest.items[itemIndex].status = "archived";
  manifest.openItemCount = manifest.items.filter((i) => i.status === "open").length;
  manifest.updatedAt = new Date().toISOString();

  const archiveDir = path.join(rootDir, ".archive", getCurrentYearMonth());
  fs.mkdirSync(archiveDir, { recursive: true });

  const sourcePath = path.join(rootDir, item.path);
  const destPath = path.join(archiveDir, item.slug);
  fs.renameSync(sourcePath, destPath);

  const backlogPath = path.join(rootDir, "backlog.md");
  if (fs.existsSync(backlogPath)) {
    let backlogContent = fs.readFileSync(backlogPath, "utf-8");
    backlogContent = backlogContent
      .split("\n")
      .filter((line) => !line.includes(`work/${item.slug}/index.md`))
      .join("\n");
    fs.writeFileSync(backlogPath, backlogContent, "utf-8");
  }

  return { manifest };
}

export function updateItemStatus(
  rootDir: string,
  manifest: Manifest,
  itemSlug: string,
  status: ManifestItemStatus,
): { manifest: Manifest } {
  const itemIndex = manifest.items.findIndex((i) => i.slug === itemSlug || i.id === itemSlug);
  if (itemIndex === -1) {
    throw new Error(`Item "${itemSlug}" not found`);
  }

  manifest.items[itemIndex].status = status;
  manifest.items[itemIndex].updated = new Date().toISOString();
  manifest.openItemCount = manifest.items.filter((i) => i.status === "open").length;
  manifest.updatedAt = new Date().toISOString();

  return { manifest };
}

function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

function getCurrentYearMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}/${month}`;
}
