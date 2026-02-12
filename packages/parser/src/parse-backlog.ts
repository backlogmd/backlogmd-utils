import type { List, ListItem, Link, PhrasingContent } from "mdast";
import { parseMd } from "./md.js";
import type { BacklogEntry } from "./types.js";
import { parseItemType } from "./parse-slug.js";

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
 * Extract the item slug from a backlog link URL.
 *
 * Given a URL like `work/001-feat-xyz/index.md`, extracts `001-feat-xyz`.
 * Returns null if the URL doesn't match the expected pattern.
 */
function extractSlugFromUrl(url: string): string | null {
  const match = url.match(/^work\/([^/]+)\/index\.md$/);
  return match ? match[1] : null;
}

/**
 * Parse the content of a SPEC v2 backlog.md file.
 *
 * SPEC v2 format is a simple bullet list of markdown links:
 *   - [<item-slug>](work/<item-slug>/index.md)
 *
 * Items are ordered by priority — first item is highest priority.
 */
export function parseBacklog(content: string, source: string): BacklogEntry[] {
  const tree = parseMd(content);
  const entries: BacklogEntry[] = [];

  for (const node of tree.children) {
    if (node.type !== "list") continue;

    const list = node as List;
    for (const item of list.children) {
      const link = findLink(item as ListItem);
      if (!link) continue;

      const slug =
        extractSlugFromUrl(link.url) ?? collectText(link.children).trim();

      if (slug) {
        entries.push({ slug, type: parseItemType(slug), source });
      }
    }
  }

  return entries;
}
