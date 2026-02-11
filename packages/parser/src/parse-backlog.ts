import type { Heading, List, ListItem, Paragraph, Link, PhrasingContent } from "mdast";
import { parseMd } from "./md.js";
import type { ItemStatus, ItemType, RoadmapItem } from "./types.js";

const VALID_ITEM_TYPES: readonly string[] = ["feature", "bugfix", "refactor", "chore"];

/**
 * Extract the plain text from an array of phrasing content nodes.
 */
function phrasingToText(nodes: PhrasingContent[]): string {
  return nodes
    .map((n) => {
      if (n.type === "text") return n.value;
      if (n.type === "strong" || n.type === "emphasis" || n.type === "delete") {
        return phrasingToText(n.children);
      }
      if (n.type === "link") {
        return phrasingToText(n.children);
      }
      if (n.type === "inlineCode") return n.value;
      return "";
    })
    .join("");
}

/**
 * Parse a heading like `### 001 - Item Name` and return the id and name,
 * or null if it doesn't match.
 */
function parseItemHeading(heading: Heading): { id: string; name: string } | null {
  const text = phrasingToText(heading.children).trim();
  const match = text.match(/^(\d{3})\s*-\s*(.+)$/);
  if (!match) return null;
  return { id: match[1], name: match[2].trim() };
}

/**
 * Normalize status strings to the canonical ItemStatus values.
 */
function normalizeStatus(raw: string): ItemStatus {
  const lower = raw.toLowerCase().trim();
  switch (lower) {
    case "todo":
    case "to do":
    case "to-do":
      return "todo";
    case "in-progress":
    case "in progress":
    case "wip":
      return "in-progress";
    case "done":
    case "complete":
    case "completed":
      return "done";
    default:
      throw new Error(`Unknown status: "${raw}"`);
  }
}

/**
 * Normalize type strings to the canonical ItemType values.
 */
function normalizeType(raw: string): ItemType {
  const lower = raw.toLowerCase().trim();
  if (!VALID_ITEM_TYPES.includes(lower)) {
    throw new Error(
      `Unknown type: "${raw}". Expected one of: ${VALID_ITEM_TYPES.join(", ")}`,
    );
  }
  return lower as ItemType;
}

/**
 * Extract the value after a bold label in a paragraph.
 * E.g. for `**Status:** todo` returns "todo".
 * Returns null if the label doesn't match.
 */
function extractLabelValue(
  paragraph: Paragraph,
  label: string,
): { text: string; link: Link | null } | null {
  const children = paragraph.children;
  // Expect pattern: Strong("Label:"), Text(" value") or Link
  if (children.length === 0) return null;

  const first = children[0];
  if (first.type !== "strong") return null;

  const strongText = phrasingToText(first.children);
  if (!strongText.startsWith(label + ":")) return null;

  // Collect the rest as text, but also track if there's a link
  let link: Link | null = null;
  let text = "";

  // The strong node may contain trailing text after the colon
  const afterColon = strongText.slice(label.length + 1).trim();
  if (afterColon) text += afterColon;

  for (let i = 1; i < children.length; i++) {
    const node = children[i];
    if (node.type === "link") {
      link = node;
      text += phrasingToText(node.children);
    } else if (node.type === "text") {
      text += node.value;
    } else {
      text += phrasingToText([node]);
    }
  }

  return { text: text.trim(), link };
}

/**
 * Extract the item slug from an item link like `items/my-item/index.md`,
 * or return null if it's an em dash (meaning no item folder).
 */
function extractItemSlug(
  labelResult: { text: string; link: Link | null } | null,
): string | null {
  if (!labelResult) return null;

  // Em dash means no item folder
  if (labelResult.text === "\u2014" || labelResult.text === "—") return null;

  if (labelResult.link) {
    const url = labelResult.link.url;
    const match = url.match(/^items\/([^/]+)\/index\.md$/);
    if (match) return match[1];
    throw new Error(`Invalid item link URL: "${url}"`);
  }

  // Plain text that is an em dash
  if (labelResult.text.trim() === "\u2014" || labelResult.text.trim() === "—") return null;

  throw new Error(
    `Item field must be a link to items/<slug>/index.md or an em dash, got: "${labelResult.text}"`,
  );
}

/**
 * Parse the content of a backlog.md file and return an array of RoadmapItem objects.
 */
export function parseBacklog(content: string, source: string): RoadmapItem[] {
  const tree = parseMd(content);
  const items: RoadmapItem[] = [];
  const errors: string[] = [];

  const children = tree.children;

  // Find the ## Items section
  let itemsStart = -1;
  for (let i = 0; i < children.length; i++) {
    const node = children[i];
    if (
      node.type === "heading" &&
      node.depth === 2 &&
      phrasingToText(node.children).trim().toLowerCase() === "items"
    ) {
      itemsStart = i + 1;
      break;
    }
  }

  if (itemsStart === -1) {
    return [];
  }

  // Find the end of the ## Items section (next h2 or end)
  let itemsEnd = children.length;
  for (let i = itemsStart; i < children.length; i++) {
    const node = children[i];
    if (node.type === "heading" && node.depth <= 2) {
      itemsEnd = i;
      break;
    }
  }

  // Process each ### heading within the Items section
  for (let i = itemsStart; i < itemsEnd; i++) {
    const node = children[i];
    if (node.type !== "heading" || node.depth !== 3) continue;

    const heading = node as Heading;
    const parsed = parseItemHeading(heading);
    if (!parsed) {
      errors.push(
        `Malformed item heading at line ${heading.position?.start.line}: "${phrasingToText(heading.children)}"`,
      );
      continue;
    }

    // Collect the list items following this heading
    const listItems: ListItem[] = [];
    for (let j = i + 1; j < itemsEnd; j++) {
      const next = children[j];
      if (next.type === "heading") break;
      if (next.type === "list") {
        const list = next as List;
        listItems.push(...list.children);
      }
    }

    // Extract fields from list items
    let typeValue: string | null = null;
    let statusValue: string | null = null;
    let itemLabelResult: { text: string; link: Link | null } | null = null;
    let descriptionValue: string | null = null;
    let hasItemField = false;

    for (const item of listItems) {
      // Each list item should have a paragraph as its first child
      if (item.children.length === 0 || item.children[0].type !== "paragraph") continue;
      const para = item.children[0] as Paragraph;

      const typeResult = extractLabelValue(para, "Type");
      if (typeResult) {
        typeValue = typeResult.text;
        continue;
      }

      const statusResult = extractLabelValue(para, "Status");
      if (statusResult) {
        statusValue = statusResult.text;
        continue;
      }

      const itemResult = extractLabelValue(para, "Item");
      if (itemResult) {
        itemLabelResult = itemResult;
        hasItemField = true;
        continue;
      }

      const descResult = extractLabelValue(para, "Description");
      if (descResult) {
        descriptionValue = descResult.text;
        continue;
      }
    }

    // Validate required fields
    const itemErrors: string[] = [];

    if (typeValue === null) {
      itemErrors.push(`Item ${parsed.id} ("${parsed.name}"): missing Type field`);
    }

    if (statusValue === null) {
      itemErrors.push(`Item ${parsed.id} ("${parsed.name}"): missing Status field`);
    }

    if (!hasItemField) {
      itemErrors.push(`Item ${parsed.id} ("${parsed.name}"): missing Item field`);
    }

    if (descriptionValue === null) {
      itemErrors.push(`Item ${parsed.id} ("${parsed.name}"): missing Description field`);
    }

    if (itemErrors.length > 0) {
      errors.push(...itemErrors);
      continue;
    }

    // Normalize type
    let type: ItemType;
    try {
      type = normalizeType(typeValue!);
    } catch (e) {
      errors.push(`Item ${parsed.id} ("${parsed.name}"): ${(e as Error).message}`);
      continue;
    }

    // Normalize status
    let status: ItemStatus;
    try {
      status = normalizeStatus(statusValue!);
    } catch (e) {
      errors.push(
        `Item ${parsed.id} ("${parsed.name}"): ${(e as Error).message}`,
      );
      continue;
    }

    // Extract item slug
    let itemSlug: string | null;
    try {
      itemSlug = extractItemSlug(itemLabelResult);
    } catch (e) {
      errors.push(
        `Item ${parsed.id} ("${parsed.name}"): ${(e as Error).message}`,
      );
      continue;
    }

    items.push({
      id: parsed.id,
      name: parsed.name,
      type,
      status,
      statusDerived: null,
      itemSlug,
      description: descriptionValue!,
      taskRefs: [],
      source,
    });
  }

  if (errors.length > 0) {
    throw new Error(
      `Errors parsing backlog (${source}):\n${errors.map((e) => `  - ${e}`).join("\n")}`,
    );
  }

  return items;
}
