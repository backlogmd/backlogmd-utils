import path from "path";
import fs from "node:fs";

// Resolve backlog root: directory that contains work/
// Prefer .backlogmd (project/.backlogmd/work/); fallback to project root (project/work/)
// If neither exists, create .backlogmd/work/ and use it
export function resolveBacklogRoot(rootDir: string): string {
  const dotBacklogmd = path.join(rootDir, ".backlogmd");
  const workAtRoot = path.join(rootDir, "work");
  let backlogRoot: string;
  if (fs.existsSync(dotBacklogmd)) {
    backlogRoot = dotBacklogmd;
  } else if (fs.existsSync(workAtRoot)) {
    backlogRoot = rootDir;
  } else {
    fs.mkdirSync(path.join(dotBacklogmd, "work"), { recursive: true });
    backlogRoot = dotBacklogmd;
    console.error(`Created ${path.join(rootDir, ".backlogmd", "work")} (empty backlog).`);
  }
  return backlogRoot;
}
