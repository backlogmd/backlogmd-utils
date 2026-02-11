import { parseMd } from "./md.js";
import type { Task, TaskStatus, AcceptanceCriterion } from "./types.js";
import type {
  Root,
  Heading,
  List,
  ListItem,
  Paragraph,
  Strong,
  Text,
  Link,
  PhrasingContent,
} from "mdast";
import path from "node:path";

const VALID_STATUSES: TaskStatus[] = [
  "todo",
  "in-progress",
  "ready-to-review",
  "ready-to-test",
  "done",
];

export function parseTaskFile(
  content: string,
  featureSlug: string,
  source: string,
): Task {
  const tree: Root = parseMd(content);

  const name = extractTaskName(tree);
  const metadata = extractMetadata(tree);

  const status = parseStatus(metadata.get("Status"));
  const priority = metadata.get("Priority") ?? "";
  const owner = parseOwner(metadata.get("Owner"));
  const featureId = parseFeatureId(metadata.get("Feature"), tree);
  const dependsOn = parseLinkList(metadata.get("Depends on"), tree);
  const blocks = parseLinkList(metadata.get("Blocks"), tree);

  const description = extractSectionContent(tree, content, "Description");
  const acceptanceCriteria = extractAcceptanceCriteria(tree);

  const slug = deriveSlug(source);
  const id = `${featureSlug}/${priority}`;

  return {
    id,
    slug,
    name,
    status,
    priority,
    owner,
    featureId,
    dependsOn,
    blocks,
    description,
    acceptanceCriteria,
    source,
  };
}

function extractTaskName(tree: Root): string {
  const h1 = tree.children.find(
    (node): node is Heading => node.type === "heading" && node.depth === 1,
  );
  if (!h1) {
    throw new Error("Task file missing h1 heading");
  }
  return collectText(h1.children);
}

function collectText(nodes: PhrasingContent[]): string {
  return nodes
    .map((n) => {
      if (n.type === "text") return (n as Text).value;
      if ("children" in n) return collectText(n.children as PhrasingContent[]);
      return "";
    })
    .join("");
}

/**
 * Extracts the metadata bullet list that follows the h1 heading.
 * Returns a map of label -> raw text value (the part after "Label: ").
 * For link-bearing fields, returns the raw text but we also parse links separately from the AST.
 */
function extractMetadata(tree: Root): Map<string, string> {
  const result = new Map<string, string>();

  // Find the first list after h1
  const h1Index = tree.children.findIndex(
    (node) => node.type === "heading" && (node as Heading).depth === 1,
  );
  if (h1Index === -1) return result;

  const list = tree.children
    .slice(h1Index + 1)
    .find((node): node is List => node.type === "list");
  if (!list) return result;

  for (const item of list.children) {
    const li = item as ListItem;
    if (!li.children.length) continue;
    const para = li.children[0];
    if (para.type !== "paragraph") continue;

    const p = para as Paragraph;
    // Look for pattern: Strong("Label:") followed by text/links
    const strongNode = p.children.find(
      (c): c is Strong => c.type === "strong",
    );
    if (!strongNode) continue;

    const labelText = collectText(strongNode.children).replace(/:$/, "");

    // Collect the text content after the strong node
    const strongIndex = p.children.indexOf(strongNode);
    const afterStrong = p.children.slice(strongIndex + 1);
    const value = collectText(afterStrong).trim();

    result.set(labelText, value);
  }

  return result;
}

function parseStatus(raw: string | undefined): TaskStatus {
  if (!raw) {
    throw new Error("Task file missing Status field");
  }
  const trimmed = raw.trim();
  if (!VALID_STATUSES.includes(trimmed as TaskStatus)) {
    throw new Error(
      `Invalid task status: "${trimmed}". Must be one of: ${VALID_STATUSES.join(", ")}`,
    );
  }
  return trimmed as TaskStatus;
}

function parseOwner(raw: string | undefined): string | null {
  if (!raw || raw.trim() === "—" || raw.trim() === "-") return null;
  return raw.trim();
}

/**
 * Parse the Feature field to extract the feature id from the anchor link.
 * E.g., the link href "../../backlog.md#001---feature-name" -> "001"
 */
function parseFeatureId(raw: string | undefined, tree: Root): string {
  // Walk the metadata list to find the Feature item's link
  const h1Index = tree.children.findIndex(
    (node) => node.type === "heading" && (node as Heading).depth === 1,
  );
  if (h1Index === -1) return raw ?? "";

  const list = tree.children
    .slice(h1Index + 1)
    .find((node): node is List => node.type === "list");
  if (!list) return raw ?? "";

  for (const item of list.children) {
    const li = item as ListItem;
    if (!li.children.length) continue;
    const para = li.children[0];
    if (para.type !== "paragraph") continue;
    const p = para as Paragraph;

    const strongNode = p.children.find(
      (c): c is Strong => c.type === "strong",
    );
    if (!strongNode) continue;
    const label = collectText(strongNode.children).replace(/:$/, "");
    if (label !== "Feature") continue;

    // Find a link node in this paragraph
    const linkNode = p.children.find((c): c is Link => c.type === "link");
    if (!linkNode) break;

    const url = linkNode.url;
    const hashIndex = url.indexOf("#");
    if (hashIndex === -1) break;

    const anchor = url.slice(hashIndex + 1);
    // Extract the numeric prefix before the first "---"
    const match = anchor.match(/^(\d+)---/);
    if (match) return match[1];
    // Fallback: return the whole anchor
    return anchor;
  }

  return raw ?? "";
}

/**
 * Parse a link list field (Depends on / Blocks).
 * Returns link texts for link nodes, or an empty array for em dash.
 */
function parseLinkList(raw: string | undefined, tree: Root): string[] {
  if (!raw || raw.trim() === "—" || raw.trim() === "-") return [];

  // Walk the AST to find the actual link nodes for this field
  // We need to find the right metadata list item
  const h1Index = tree.children.findIndex(
    (node) => node.type === "heading" && (node as Heading).depth === 1,
  );
  if (h1Index === -1) return raw ? [raw.trim()] : [];

  const list = tree.children
    .slice(h1Index + 1)
    .find((node): node is List => node.type === "list");
  if (!list) return raw ? [raw.trim()] : [];

  // Determine which label we're looking for based on the raw value
  // We need to check both "Depends on" and "Blocks" items
  for (const item of list.children) {
    const li = item as ListItem;
    if (!li.children.length) continue;
    const para = li.children[0];
    if (para.type !== "paragraph") continue;
    const p = para as Paragraph;

    const strongNode = p.children.find(
      (c): c is Strong => c.type === "strong",
    );
    if (!strongNode) continue;
    const label = collectText(strongNode.children).replace(/:$/, "");

    // Check if this item's text matches our raw value
    const strongIndex = p.children.indexOf(strongNode);
    const afterStrong = p.children.slice(strongIndex + 1);
    const itemText = collectText(afterStrong).trim();
    if (itemText !== raw) continue;

    // Collect link texts from this paragraph
    const links: string[] = [];
    for (const child of afterStrong) {
      if (child.type === "link") {
        links.push(collectText((child as Link).children));
      }
    }
    if (links.length > 0) return links;

    // No links found, but we have text - split by comma
    if (label === "Depends on" || label === "Blocks") {
      return itemText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }

  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Extract the content of a ## section as raw markdown.
 * Returns the raw markdown text between the section heading and the next heading or EOF.
 */
function extractSectionContent(
  tree: Root,
  rawContent: string,
  sectionName: string,
): string {
  const lines = rawContent.split("\n");

  // Find the h2 heading for this section
  let sectionHeadingIndex = -1;
  let nextHeadingIndex = -1;

  for (let i = 0; i < tree.children.length; i++) {
    const node = tree.children[i];
    if (node.type === "heading") {
      const h = node as Heading;
      if (h.depth === 2 && collectText(h.children) === sectionName) {
        sectionHeadingIndex = i;
        // Find next heading
        for (let j = i + 1; j < tree.children.length; j++) {
          if (tree.children[j].type === "heading") {
            nextHeadingIndex = j;
            break;
          }
        }
        break;
      }
    }
  }

  if (sectionHeadingIndex === -1) return "";

  const sectionNode = tree.children[sectionHeadingIndex];
  const startLine = sectionNode.position!.end.line;

  let endLine: number;
  if (nextHeadingIndex !== -1) {
    endLine = tree.children[nextHeadingIndex].position!.start.line - 1;
  } else {
    endLine = lines.length;
  }

  // Extract lines between section heading and next heading
  const sectionLines = lines.slice(startLine, endLine);

  // Trim leading/trailing blank lines
  return trimBlankLines(sectionLines.join("\n"));
}

function trimBlankLines(s: string): string {
  return s.replace(/^\n+/, "").replace(/\n+$/, "");
}

/**
 * Extract acceptance criteria from the ## Acceptance Criteria section.
 * Looks for GFM task list items: - [ ] text or - [x] text
 */
function extractAcceptanceCriteria(tree: Root): AcceptanceCriterion[] {
  // Find the h2 "Acceptance Criteria" heading
  let sectionIndex = -1;
  for (let i = 0; i < tree.children.length; i++) {
    const node = tree.children[i];
    if (
      node.type === "heading" &&
      (node as Heading).depth === 2 &&
      collectText((node as Heading).children) === "Acceptance Criteria"
    ) {
      sectionIndex = i;
      break;
    }
  }

  if (sectionIndex === -1) return [];

  // Find the next list after this heading
  const criteria: AcceptanceCriterion[] = [];
  for (let i = sectionIndex + 1; i < tree.children.length; i++) {
    const node = tree.children[i];
    if (node.type === "heading") break; // Stop at next heading

    if (node.type === "list") {
      const list = node as List;
      for (const item of list.children) {
        const li = item as ListItem;
        const checked = li.checked === true;
        // Collect text from the list item
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

function deriveSlug(source: string): string {
  const basename = path.basename(source, ".md");
  // Remove priority prefix (e.g., "001-setup" -> "setup")
  const match = basename.match(/^\d+-(.+)$/);
  return match ? match[1] : basename;
}
