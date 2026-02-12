import type { Task, TaskStatus, AcceptanceCriterion } from "./types.js";
import { parseMd } from "./md.js";
import type { Root, Heading, List, ListItem, Paragraph, PhrasingContent } from "mdast";
import path from "node:path";

const VALID_STATUSES: TaskStatus[] = ["open", "block", "in-progress", "done"];

/**
 * Parse a SPEC v2 task file.
 *
 * SPEC v2 format uses HTML comment sections with a fenced code block for metadata:
 *
 * ```
 * <!-- METADATA -->
 * \`\`\`
 * Task: <Task Name>
 * Status: <status>
 * Priority: <NNN>
 * DependsOn: [<task-slug>](relative-path-to-task.md)
 * \`\`\`
 * <!-- /METADATA -->
 * <!-- DESCRIPTION -->
 * ## Description
 * <text>
 * <!-- /DESCRIPTION -->
 * <!-- ACCEPTANCE CRITERIA -->
 * ## Acceptance criteria
 * - [ ] <criterion>
 * <!-- /ACCEPTANCE CRITERIA -->
 * ```
 */
export function parseTaskFile(
  content: string,
  itemSlug: string,
  source: string,
): Task {
  // Extract sections using HTML comment boundaries
  const metadataRaw = extractSection(content, "METADATA");
  const descriptionRaw = extractSection(content, "DESCRIPTION");
  const acRaw = extractSection(content, "ACCEPTANCE CRITERIA");

  // Parse metadata from the fenced code block
  const metadata = parseMetadataBlock(metadataRaw, source);

  // Parse description: strip the ## Description heading
  const description = cleanDescription(descriptionRaw);

  // Parse acceptance criteria from markdown checkboxes
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

/**
 * Extract the content between `<!-- SECTION -->` and `<!-- /SECTION -->` markers.
 */
function extractSection(content: string, sectionName: string): string {
  const startTag = `<!-- ${sectionName} -->`;
  const endTag = `<!-- /${sectionName} -->`;
  const startIndex = content.indexOf(startTag);
  const endIndex = content.indexOf(endTag);
  if (startIndex === -1 || endIndex === -1) return "";
  return content.slice(startIndex + startTag.length, endIndex).trim();
}

/**
 * Parse key-value pairs from a fenced code block inside the METADATA section.
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

  // Validate required fields
  const taskName = metadata["Task"];
  if (!taskName) {
    throw new Error(`Task file missing "Task" field in metadata (${source})`);
  }

  const statusRaw = metadata["Status"];
  if (!statusRaw) {
    throw new Error(`Task file missing "Status" field in metadata (${source})`);
  }

  const status = parseStatus(statusRaw, source);
  const priority = metadata["Priority"] ?? "";

  // Parse DependsOn — may contain markdown links or be "—" / empty
  const dependsOnRaw = metadata["DependsOn"] ?? "";
  const dependsOn = parseDependsOn(dependsOnRaw);

  return { task: taskName, status, priority, dependsOn };
}

/**
 * Validate and return a TaskStatus.
 */
function parseStatus(raw: string, source: string): TaskStatus {
  const trimmed = raw.trim().toLowerCase();
  if (!VALID_STATUSES.includes(trimmed as TaskStatus)) {
    throw new Error(
      `Invalid task status: "${raw}" in ${source}. Must be one of: ${VALID_STATUSES.join(", ")}`,
    );
  }
  return trimmed as TaskStatus;
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
