import fs from "node:fs";
import path from "node:path";
import type { Manifest, ManifestTask } from "@backlogmd/types";

export function reconcileManifestToMd(rootDir: string, manifest: Manifest): void {
  for (const item of manifest.items) {
    const itemDir = path.join(rootDir, item.path);

    if (!fs.existsSync(itemDir)) {
      fs.mkdirSync(itemDir, { recursive: true });
    }

    const indexPath = path.join(itemDir, "index.md");
    const currentIndex = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, "utf-8") : "";
    const newIndex = renderItemIndex(item.tasks);

    if (currentIndex.trim() !== newIndex.trim()) {
      fs.writeFileSync(indexPath, newIndex, "utf-8");
    }

    for (const task of item.tasks) {
      const taskPath = path.join(itemDir, task.file);
      const currentTask = fs.existsSync(taskPath) ? fs.readFileSync(taskPath, "utf-8") : "";
      const newTask = renderTaskFile(task);

      if (currentTask.trim() !== newTask.trim()) {
        fs.writeFileSync(taskPath, newTask, "utf-8");
      }
    }
  }
}

export function reconcileBacklogMd(rootDir: string, manifest: Manifest): void {
  const backlogPath = path.join(rootDir, "backlog.md");
  const openItems = manifest.items.filter((i) => i.status === "open");

  const lines = openItems.map((item) => `- [${item.slug}](work/${item.slug}/index.md)`);
  const newContent = lines.join("\n") + "\n";

  if (fs.existsSync(backlogPath)) {
    const currentContent = fs.readFileSync(backlogPath, "utf-8");
    if (currentContent.trim() !== newContent.trim()) {
      fs.writeFileSync(backlogPath, newContent, "utf-8");
    }
  } else {
    fs.writeFileSync(backlogPath, newContent, "utf-8");
  }
}

function renderItemIndex(tasks: ManifestTask[]): string {
  const lines = tasks.map((t) => `- [${t.slug}](${t.file})`);
  return lines.join("\n") + "\n";
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
