import type { Task, TaskStatus, AcceptanceCriterion } from "./types.js";
import { parseMd } from "./md.js";
import type { Root, Heading, List, ListItem, Paragraph, PhrasingContent } from "mdast";
import path from "node:path";

const VALID_STATUSES: TaskStatus[] = ["plan", "open", "in-progress", "review", "block", "done"];

/**
 * Detect if content uses YAML frontmatter (starts with ---).
 */
function hasFrontmatter(content: string): boolean {
  const trimmed = content.trimStart();
  return trimmed.startsWith("---\n") || trimmed.startsWith("---\r\n");
}

/**
 * Split content into frontmatter string and body string.
 * Assumes hasFrontmatter(content) is true.
 */
function splitFrontmatter(content: string): { frontmatter: string; body: string } {
  const trimmed = content.trimStart();
  const afterFirst = trimmed.slice(4); // after "---\n"
  const endIndex = afterFirst.indexOf("\n---");
  if (endIndex === -1) {
    return { frontmatter: afterFirst.trim(), body: "" };
  }
  return {
    frontmatter: afterFirst.slice(0, endIndex).trim(),
    body: afterFirst.slice(endIndex + 4).trim(),
  };
}

/**
 * Strip optional surrounding single or double quotes from a value.
 */
function unquote(value: string): string {
  const v = value.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  return v;
}

/** Get first value from metadata for any of the given keys (case-sensitive). */
function getMeta(metadata: Record<string, string>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    if (metadata[k] !== undefined && metadata[k] !== "") return metadata[k];
  }
  return undefined;
}

/**
 * Parse frontmatter key-value block (YAML-like: "Key: value" per line).
 * Accepts alternate keys: Task/Title/Name, Status/State, Priority/Prio, DependsOn/Depends/Dependencies.
 */
function parseFrontmatterBlock(
  raw: string,
  source: string,
): {
  task: string;
  status: TaskStatus;
  priority: string;
  dependsOn: string[];
} {
  const metadata: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim();
    const value = unquote(line.slice(colonIndex + 1).trim());
    if (key) metadata[key] = value;
  }

  const taskName = getMeta(metadata, "Task", "Title", "Name");
  if (!taskName) {
    throw new Error(`Task file missing "Task" (or "Title"/"Name") in frontmatter (${source})`);
  }

  const statusRaw = getMeta(metadata, "Status", "State");
  if (!statusRaw) {
    throw new Error(`Task file missing "Status" (or "State") in frontmatter (${source})`);
  }

  const status = parseStatus(statusRaw, source);
  const priority = getMeta(metadata, "Priority", "Prio") ?? "";

  const dependsOnRaw = getMeta(metadata, "DependsOn", "Depends", "Dependencies") ?? "[]";
  const dependsOn = parseDependsOnFromFrontmatter(dependsOnRaw);

  return { task: taskName, status, priority, dependsOn };
}

/**
 * Parse DependsOn from frontmatter: "[]" or "[slug1, slug2]" or "slug1, slug2".
 */
function parseDependsOnFromFrontmatter(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "[]") return [];
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as string[];
      return Array.isArray(parsed) ? parsed.map((s) => String(s).trim()).filter(Boolean) : [];
    } catch {
      // fallback: strip [ ] and split by comma
      const inner = trimmed.slice(1, -1).trim();
      return inner ? inner.split(",").map((s) => s.trim()).filter(Boolean) : [];
    }
  }
  return trimmed.split(",").map((s) => s.trim()).filter(Boolean);
}

/**
 * Extract section from body by ## Heading, up to next ## or end.
 */
function extractBodySection(body: string, heading: string): string {
  const re = new RegExp(`^##\\s+${heading}\\s*$`, "im");
  const lines = body.split("\n");
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (re.test(lines[i].trim())) {
      start = i + 1;
      break;
    }
  }
  if (start === -1) return "";
  let end = lines.length;
  for (let i = start; i < lines.length; i++) {
    if (lines[i].match(/^##\s+/)) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join("\n").trim();
}

/**
 * Parse a task file. Supports:
 * - SPEC v2: HTML comment sections with fenced code block for metadata.
 * - New structure: YAML frontmatter (--- ... ---) then ## Description and ## Acceptance criteria.
 */
export function parseTaskFile(
  content: string,
  itemSlug: string,
  source: string,
): Task {
  if (hasFrontmatter(content)) {
    const { frontmatter, body } = splitFrontmatter(content);
    const metadata = parseFrontmatterBlock(frontmatter, source);
    const descriptionRaw = extractBodySection(body, "Description");
    const acRaw = extractBodySection(body, "Acceptance criteria");
    const description = trimBlankLines(descriptionRaw);
    const acceptanceCriteria = parseAcceptanceCriteria(acRaw);
    const slug = deriveSlug(source);
    return {
      name: metadata.task,
      status: metadata.status,
      priority: metadata.priority,
      slug,
      itemSlug,
      dependsOn: metadata.dependsOn,
      description,
      acceptanceCriteria,
      source,
    };
  }

  // HTML comment METADATA: try SPEC v4 first (task:, dep:), then v2 (Task:, DependsOn:)
  const metadataRaw = extractSection(content, "METADATA");
  const descriptionRaw = extractSection(content, "DESCRIPTION");
  const slug = deriveSlug(source);

  const v4Meta = tryParseMetadataV4(metadataRaw, source);
  if (v4Meta) {
    const acRaw = extractSection(content, "ACCEPTANCE");
    const description = cleanDescription(descriptionRaw);
    const acceptanceCriteria = parseAcceptanceCriteria(acRaw);
    return {
      name: v4Meta.task,
      status: v4Meta.status,
      priority: v4Meta.priority,
      slug,
      itemSlug,
      dependsOn: v4Meta.dependsOn,
      description,
      acceptanceCriteria,
      source,
      assignee: v4Meta.assignee,
      requiresHumanReview: v4Meta.requiresHumanReview,
      expiresAt: v4Meta.expiresAt,
    };
  }

  const metadata = parseMetadataBlock(metadataRaw, source);
  const acRaw = extractSection(content, "ACCEPTANCE CRITERIA");
  const description = cleanDescription(descriptionRaw);
  const acceptanceCriteria = parseAcceptanceCriteria(acRaw);

  return {
    name: metadata.task,
    status: metadata.status,
    priority: metadata.priority,
    slug,
    itemSlug,
    dependsOn: metadata.dependsOn,
    description,
    acceptanceCriteria,
    source,
  };
}

/**
 * Extract section content. Supports SPEC v4 (no closing tag): from <!-- SECTION --> until next <!-- or end.
 */
function extractSection(content: string, sectionName: string): string {
  const startTag = `<!-- ${sectionName} -->`;
  const endTag = `<!-- /${sectionName} -->`;
  const startIndex = content.indexOf(startTag);
  if (startIndex === -1) return "";

  const from = startIndex + startTag.length;
  const endByClose = content.indexOf(endTag, from);
  const endByNext = content.indexOf("<!--", from);
  const endIndex =
    endByClose === -1
      ? endByNext === -1
        ? content.length
        : endByNext
      : endByNext === -1
        ? endByClose
        : Math.min(endByClose, endByNext);

  return content.slice(from, endIndex).trim();
}

/**
 * Parse SPEC v4 METADATA: task, status, priority, dep, assignee, requiresHumanReview, expiresAt.
 * Returns null if not v4 format (no lowercase "task:" key).
 */
function tryParseMetadataV4(
  raw: string,
  source: string,
): {
  task: string;
  status: TaskStatus;
  priority: string;
  dependsOn: string[];
  assignee?: string;
  requiresHumanReview?: boolean;
  expiresAt?: string | null;
} | null {
  const codeMatch = raw.match(/```[\s\S]*?\n([\s\S]*?)```/);
  if (!codeMatch) return null;

  const lines = codeMatch[1].split("\n");
  const metadata: Record<string, string> = {};
  for (const line of lines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    if (key) metadata[key] = value;
  }

  const taskName = metadata["task"];
  if (taskName === undefined || taskName === "") return null;

  const statusRaw = metadata["status"];
  if (!statusRaw) {
    throw new Error(`Task file missing "status" in metadata (${source})`);
  }
  const status = parseStatus(statusRaw, source);
  const priorityRaw = metadata["priority"];
  const priority = priorityRaw !== undefined && priorityRaw !== "" ? String(priorityRaw) : "";

  let dependsOn: string[] = [];
  const depRaw = metadata["dep"];
  if (depRaw !== undefined && depRaw.trim() !== "") {
    const trimmed = depRaw.trim();
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed) as string[];
        dependsOn = Array.isArray(parsed) ? parsed.map((s) => String(s).trim()).filter(Boolean) : [];
      } catch {
        dependsOn = [];
      }
    }
  }

  const assigneeRaw = metadata["assignee"];
  const assignee = assigneeRaw !== undefined ? unquote(assigneeRaw) : undefined;
  const requiresHumanReview =
    metadata["requiresHumanReview"]?.toLowerCase() === "true";
  const expiresAtRaw = metadata["expiresAt"];
  const expiresAt =
    expiresAtRaw === undefined || expiresAtRaw.trim().toLowerCase() === "null"
      ? null
      : expiresAtRaw.trim() || null;

  return {
    task: taskName.trim(),
    status,
    priority,
    dependsOn,
    assignee: assignee !== undefined ? assignee : undefined,
    requiresHumanReview,
    expiresAt,
  };
}

/**
 * Parse key-value pairs from a fenced code block inside the METADATA section (SPEC v2).
 */
function parseMetadataBlock(
  raw: string,
  source: string,
): {
  task: string;
  status: TaskStatus;
  priority: string;
  dependsOn: string[];
} {
  // Extract content from the fenced code block (``` ... ```)
  const codeMatch = raw.match(/```[\s\S]*?\n([\s\S]*?)```/);
  if (!codeMatch) {
    throw new Error(`Metadata code block not found in ${source}`);
  }

  const lines = codeMatch[1].split("\n");
  const metadata: Record<string, string> = {};

  for (const line of lines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    if (key) metadata[key] = value;
  }

  // Validate required fields (accept Task/Title/Name, Status/State)
  const taskName = getMeta(metadata, "Task", "Title", "Name");
  if (!taskName) {
    throw new Error(`Task file missing "Task" (or "Title"/"Name") in metadata (${source})`);
  }

  const statusRaw = getMeta(metadata, "Status", "State");
  if (!statusRaw) {
    throw new Error(`Task file missing "Status" (or "State") in metadata (${source})`);
  }

  const status = parseStatus(statusRaw, source);
  const priority = getMeta(metadata, "Priority", "Prio") ?? "";

  // Parse DependsOn — may contain markdown links or be "—" / empty
  const dependsOnRaw = metadata["DependsOn"] ?? "";
  const dependsOn = parseDependsOn(dependsOnRaw);

  return { task: taskName, status, priority, dependsOn };
}

/**
 * Validate and return a TaskStatus.
 */
/** Map common alternate status values to canonical TaskStatus. */
const STATUS_ALIASES: Record<string, TaskStatus> = {
  todo: "open",
  pending: "open",
  completed: "done",
  blocked: "block",
};

function parseStatus(raw: string, source: string): TaskStatus {
  const trimmed = raw.trim().toLowerCase();
  const canonical = STATUS_ALIASES[trimmed] ?? (trimmed as TaskStatus);
  if (!VALID_STATUSES.includes(canonical)) {
    throw new Error(
      `Invalid task status: "${raw}" in ${source}. Must be one of: ${VALID_STATUSES.join(", ")}`,
    );
  }
  return canonical;
}

/**
 * Parse the DependsOn field value.
 *
 * Can be:
 * - Empty or "—" → no dependencies
 * - A markdown link: [slug](path.md) → extract the link text
 * - Multiple comma-separated links
 */
function parseDependsOn(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "—" || trimmed === "-" || trimmed === "–") {
    return [];
  }

  // Extract link texts from markdown link syntax: [text](url)
  const linkPattern = /\[([^\]]+)\]\([^)]+\)/g;
  const links: string[] = [];
  let match;
  while ((match = linkPattern.exec(trimmed)) !== null) {
    links.push(match[1].trim());
  }

  if (links.length > 0) return links;

  // Fallback: split by comma
  return trimmed
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Clean the description section: remove the ## Description heading line.
 */
function cleanDescription(raw: string): string {
  if (!raw) return "";
  // Remove the heading line
  const lines = raw.split("\n");
  const filtered = lines.filter(
    (line) => !line.match(/^##\s+[Dd]escription\s*$/),
  );
  return trimBlankLines(filtered.join("\n"));
}

function trimBlankLines(s: string): string {
  return s.replace(/^\n+/, "").replace(/\n+$/, "");
}

/**
 * Extract acceptance criteria from the ACCEPTANCE CRITERIA section.
 * Parses GFM task list items: - [ ] text or - [x] text
 */
function parseAcceptanceCriteria(raw: string): AcceptanceCriterion[] {
  if (!raw) return [];

  // Parse with remark to get proper checkbox handling
  const tree = parseMd(raw);
  const criteria: AcceptanceCriterion[] = [];

  for (const node of tree.children) {
    if (node.type === "list") {
      const list = node as List;
      for (const item of list.children) {
        const li = item as ListItem;
        const checked = li.checked === true;
        const text = li.children
          .map((child) => {
            if (child.type === "paragraph") {
              return collectText((child as Paragraph).children);
            }
            return "";
          })
          .join("")
          .trim();

        if (text) {
          criteria.push({ text, checked });
        }
      }
    }
  }

  return criteria;
}

function collectText(nodes: PhrasingContent[]): string {
  return nodes
    .map((n) => {
      if (n.type === "text") return n.value;
      if ("children" in n) return collectText(n.children as PhrasingContent[]);
      return "";
    })
    .join("");
}

function deriveSlug(source: string): string {
  const basename = path.basename(source, ".md");
  // Remove priority prefix (e.g., "001-setup" -> "setup")
  const match = basename.match(/^\d+-(.+)$/);
  return match ? match[1] : basename;
}
