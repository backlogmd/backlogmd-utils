import { readFileSync } from "fs";
import path from "path";

/** Package root: one level up from src/ or dist/ (Node 20.11+ import.meta.dirname) */
const packageRoot = path.join(import.meta.dirname, "..");

/**
 * Load a skill markdown file from packages/autopilot/skills/.
 * Returns the file content or empty string if the file is missing.
 */
export function loadSkill(name: string): string {
  const skillPath = path.join(packageRoot, "skills", `${name}.md`);
  try {
    return readFileSync(skillPath, "utf-8");
  } catch {
    return "";
  }
}

/** Load the built-in BacklogMD format skill for the agent. */
export function loadBacklogmdSkill(): string {
  return loadSkill("backlogmd");
}
