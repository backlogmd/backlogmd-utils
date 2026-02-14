import type { List, ListItem, Link, PhrasingContent } from "mdast";
import { parseMd } from "../md.js";
import type { ItemFolder, TaskRef } from "../types.js";
import { parseItemType } from "./parseSlug.js";

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
 * Parse the content of a SPEC v2 item index.md file.
 *
 * SPEC v2 format is a simple bullet list of task file links:
 *   - [001-task-slug](001-task-slug.md)
 *   - [002-task-slug](002-task-slug.md)
 */
export function parseItemIndex(
  content: string,
  slug: string,
  source: string,
): ItemFolder {
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

  return { slug, type: parseItemType(slug), tasks, source };
}
