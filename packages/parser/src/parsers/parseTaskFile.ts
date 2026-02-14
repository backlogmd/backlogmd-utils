import type { Task, TaskStatus, AcceptanceCriterion } from "../types.js";
import { parseMd } from "../md.js";
import type { List, ListItem, Paragraph, PhrasingContent } from "mdast";
import { parse as parseYaml } from "yaml";
import path from "node:path";

const VALID_STATUSES: TaskStatus[] = [
  "plan",
  "open",
  "reserved",
  "ip",
  "review",
  "block",
  "done",
];

/**
 * Parse a SPEC v3 task file.
 *
 * SPEC v3 format uses three HTML comment markers with a YAML fenced code block:
 *
 * ```
 * <!-- METADATA -->
 * ```yaml
 * t: Task Name
 * s: open
 * p: 10
 * dep: ["001"]
 * a: ""
 * h: false
 * expiresAt: null
 * ```
 * <!-- DESCRIPTION -->
 * ## Description
 * <text>
 * <!-- ACCEPTANCE -->
 * ## Acceptance criteria
 * - [ ] <criterion>
 * ```
 */
export function parseTaskFile(
  content: string,
  itemSlug: string,
  source: string,
): Task {
  // Extract sections using HTML comment markers
  const metadataRaw = extractSection(content, "METADATA", "DESCRIPTION");
  const descriptionRaw = extractSection(content, "DESCRIPTION", "ACCEPTANCE");
  const acRaw = extractSectionToEnd(content, "ACCEPTANCE");

  // Parse metadata from the YAML fenced code block
  const metadata = parseMetadataBlock(metadataRaw, source);

  // Parse description: strip the ## Description heading
  const description = cleanDescription(descriptionRaw);

  // Parse acceptance criteria from markdown checkboxes
  const acceptanceCriteria = parseAcceptanceCriteria(acRaw);

  const { tid, slug } = deriveTidAndSlug(source);

  return {
    name: metadata.t,
    status: metadata.s,
    priority: metadata.p,
    tid,
    slug,
    itemSlug,
    dependsOn: metadata.dep,
    agent: metadata.a,
    humanReview: metadata.h,
    expiresAt: metadata.expiresAt,
    description,
    acceptanceCriteria,
    source,
  };
}

/**
 * Extract the content between `<!-- START -->` and `<!-- END -->` markers.
 * In v3, sections are delimited by the next marker (not closing tags).
 */
function extractSection(
  content: string,
  startMarker: string,
  endMarker: string,
): string {
  const startTag = `<!-- ${startMarker} -->`;
  const endTag = `<!-- ${endMarker} -->`;
  const startIndex = content.indexOf(startTag);
  const endIndex = content.indexOf(endTag);
  if (startIndex === -1) return "";
  const begin = startIndex + startTag.length;
  const end = endIndex === -1 ? content.length : endIndex;
  return content.slice(begin, end).trim();
}

/**
 * Extract from a marker to end of content.
 */
function extractSectionToEnd(content: string, marker: string): string {
  const tag = `<!-- ${marker} -->`;
  const index = content.indexOf(tag);
  if (index === -1) return "";
  return content.slice(index + tag.length).trim();
}

interface TaskMetadata {
  t: string;
  s: TaskStatus;
  p: number;
  dep: string[];
  a: string;
  h: boolean;
  expiresAt: string | null;
}

/**
 * Parse YAML from a fenced code block inside the METADATA section.
 */
function parseMetadataBlock(raw: string, source: string): TaskMetadata {
  // Extract content from the fenced code block (```yaml ... ``` or ``` ... ```)
  const codeMatch = raw.match(/```(?:yaml)?\s*\n([\s\S]*?)```/);
  if (!codeMatch) {
    throw new Error(`Metadata YAML code block not found in ${source}`);
  }

  const yamlContent = codeMatch[1];
  let parsed: Record<string, unknown>;
  try {
    parsed = parseYaml(yamlContent) as Record<string, unknown>;
  } catch (err) {
    throw new Error(
      `Invalid YAML in metadata block of ${source}: ${(err as Error).message}`,
    );
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error(`Metadata block is not a valid YAML mapping in ${source}`);
  }

  // Validate required fields
  const t = parsed["t"];
  if (typeof t !== "string" || !t) {
    throw new Error(`Task file missing "t" (title) field in metadata (${source})`);
  }

  const sRaw = parsed["s"];
  if (typeof sRaw !== "string" || !sRaw) {
    throw new Error(`Task file missing "s" (status) field in metadata (${source})`);
  }
  const s = parseStatus(sRaw, source);

  const p = typeof parsed["p"] === "number" ? parsed["p"] : 0;

  // dep: array of quoted task ID strings
  let dep: string[] = [];
  if (Array.isArray(parsed["dep"])) {
    dep = (parsed["dep"] as unknown[]).map((d) => String(d));
  }

  const a = typeof parsed["a"] === "string" ? parsed["a"] : "";
  const h = parsed["h"] === true;
  const expiresAt =
    typeof parsed["expiresAt"] === "string" ? parsed["expiresAt"] : null;

  return { t, s, p, dep, a, h, expiresAt };
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
 * Clean the description section: remove the ## Description heading line.
 */
function cleanDescription(raw: string): string {
  if (!raw) return "";
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
 * Extract acceptance criteria from the ACCEPTANCE section.
 * Parses GFM task list items: - [ ] text or - [x] text
 */
function parseAcceptanceCriteria(raw: string): AcceptanceCriterion[] {
  if (!raw) return [];

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

/**
 * Derive tid and slug from the source file path.
 * Given "work/001-feat-xyz/002-setup-repo.md", returns { tid: "002", slug: "setup-repo" }.
 */
function deriveTidAndSlug(source: string): { tid: string; slug: string } {
  const basename = path.basename(source, ".md");
  const match = basename.match(/^(\d+)-(.+)$/);
  if (match) {
    return { tid: match[1], slug: match[2] };
  }
  return { tid: "", slug: basename };
}
