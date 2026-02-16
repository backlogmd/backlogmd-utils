import type { List, ListItem, Link, PhrasingContent } from "mdast";
import { parseMd } from "./md.js";
import type { ItemFolder, TaskRef, ItemStatus } from "./types.js";
import { parseItemType } from "./parse-slug.js";

const ITEM_STATUSES: ItemStatus[] = ["plan", "open", "claimed", "in-progress", "done"];

/** Extract item id from slug (leading 3+ digits, e.g. "001-chore-x" → "001"). */
function parseItemId(slug: string): string | undefined {
  const m = slug.match(/^(\d{3,})/);
  return m ? m[1] : undefined;
}

/**
 * Extract section content. SPEC v4 uses consecutive sections without closing tags:
 * <!-- METADATA --> ... <!-- DESCRIPTION --> ... So we take from start until the next <!-- or end.
 */
function extractSection(content: string, sectionName: string): string {
  const startTag = `<!-- ${sectionName} -->`;
  const startIndex = content.indexOf(startTag);
  if (startIndex === -1) return "";

  const from = startIndex + startTag.length;
  const nextComment = content.indexOf("<!--", from);
  const endIndex = nextComment === -1 ? content.length : nextComment;
  return content.slice(from, endIndex).trim();
}

/** Strip optional surrounding single or double quotes. */
function unquote(value: string): string {
  const v = value.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  return v;
}

/** Parse YAML-like key-value block (e.g. from fenced code in METADATA). */
function parseYamlBlock(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    if (key) out[key] = value;
  }
  return out;
}

/**
 * Try to parse SPEC v4 item index: <!-- METADATA --> with yaml (work, status).
 * Returns folder with status and empty tasks if format matches.
 */
function tryParseV4Index(content: string, slug: string, source: string): ItemFolder | null {
  const metadataRaw = extractSection(content, "METADATA");
  if (!metadataRaw) return null;

  const codeMatch = metadataRaw.match(/```[\s\S]*?\n([\s\S]*?)```/);
  if (!codeMatch) return null;

  const meta = parseYamlBlock(codeMatch[1]);
  const work = meta["work"];
  const statusRaw = (meta["status"] ?? "").trim().toLowerCase();
  if (!work) return null;

  const status: ItemStatus | undefined = ITEM_STATUSES.includes(statusRaw as ItemStatus)
    ? (statusRaw as ItemStatus)
    : undefined;

  const assigneeRaw = meta["assignee"];
  const assignee = assigneeRaw !== undefined ? unquote(assigneeRaw) : undefined;

  return {
    id: parseItemId(slug),
    slug,
    type: parseItemType(slug),
    status,
    assignee,
    tasks: [],
    source,
  };
}

/**
 * Extract the plain text from phrasing content nodes.
 */
function collectText(nodes: PhrasingContent[]): string {
  return nodes
    .map((n) => {
      if (n.type === "text") return n.value;
      if (n.type === "link") return collectText(n.children);
      if ("children" in n) return collectText(n.children as PhrasingContent[]);
      if (n.type === "inlineCode") return n.value;
      return "";
    })
    .join("");
}

/**
 * Find the first link node in a list item's content.
 */
function findLink(item: ListItem): Link | null {
  for (const child of item.children) {
    if (child.type === "paragraph") {
      for (const c of child.children) {
        if (c.type === "link") return c;
      }
    }
  }
  return null;
}

/**
 * Parse item index.md. Supports:
 * - SPEC v4: <!-- METADATA --> with yaml (work, status); no task list. Returns tasks: [].
 * - Legacy v2: bullet list of task file links. Returns tasks from list.
 */
export function parseItemIndex(
  content: string,
  slug: string,
  source: string,
): ItemFolder {
  const v4 = tryParseV4Index(content, slug, source);
  if (v4) return v4;

  // Legacy v2: bullet list of task links
  const tree = parseMd(content);
  const tasks: TaskRef[] = [];

  for (const node of tree.children) {
    if (node.type !== "list") continue;

    const list = node as List;
    for (const item of list.children) {
      const link = findLink(item as ListItem);
      if (!link) continue;

      const taskSlug = collectText(link.children).trim();
      const fileName = link.url;

      if (taskSlug && fileName) {
        tasks.push({ slug: taskSlug, fileName });
      }
    }
  }

  return { id: parseItemId(slug), slug, type: parseItemType(slug), tasks, source };
}
