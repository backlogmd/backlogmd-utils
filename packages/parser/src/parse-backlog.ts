import type { Heading, List, ListItem, Paragraph, Link, PhrasingContent } from "mdast";
import { parseMd } from "./md.js";
import type { FeatureStatus, RoadmapFeature } from "./types.js";

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
 * Parse a heading like `### 001 - Feature Name` and return the id and name,
 * or null if it doesn't match.
 */
function parseFeatureHeading(heading: Heading): { id: string; name: string } | null {
  const text = phrasingToText(heading.children).trim();
  const match = text.match(/^(\d{3})\s*-\s*(.+)$/);
  if (!match) return null;
  return { id: match[1], name: match[2].trim() };
}

/**
 * Normalize status strings to the canonical FeatureStatus values.
 */
function normalizeStatus(raw: string): FeatureStatus {
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
 * Extract the feature slug from a feature link like `features/my-feature/index.md`,
 * or return null if it's an em dash (meaning no feature folder).
 */
function extractFeatureSlug(
  labelResult: { text: string; link: Link | null } | null,
): string | null {
  if (!labelResult) return null;

  // Em dash means no feature folder
  if (labelResult.text === "\u2014" || labelResult.text === "—") return null;

  if (labelResult.link) {
    const url = labelResult.link.url;
    const match = url.match(/^features\/([^/]+)\/index\.md$/);
    if (match) return match[1];
    throw new Error(`Invalid feature link URL: "${url}"`);
  }

  // Plain text that is an em dash
  if (labelResult.text.trim() === "\u2014" || labelResult.text.trim() === "—") return null;

  throw new Error(
    `Feature field must be a link to features/<slug>/index.md or an em dash, got: "${labelResult.text}"`,
  );
}

/**
 * Parse the content of a backlog.md file and return an array of RoadmapFeature objects.
 */
export function parseBacklog(content: string, source: string): RoadmapFeature[] {
  const tree = parseMd(content);
  const features: RoadmapFeature[] = [];
  const errors: string[] = [];

  const children = tree.children;

  // Find the ## Features section
  let featuresStart = -1;
  for (let i = 0; i < children.length; i++) {
    const node = children[i];
    if (
      node.type === "heading" &&
      node.depth === 2 &&
      phrasingToText(node.children).trim().toLowerCase() === "features"
    ) {
      featuresStart = i + 1;
      break;
    }
  }

  if (featuresStart === -1) {
    return [];
  }

  // Find the end of the ## Features section (next h2 or end)
  let featuresEnd = children.length;
  for (let i = featuresStart; i < children.length; i++) {
    const node = children[i];
    if (node.type === "heading" && node.depth <= 2) {
      featuresEnd = i;
      break;
    }
  }

  // Process each ### heading within the Features section
  for (let i = featuresStart; i < featuresEnd; i++) {
    const node = children[i];
    if (node.type !== "heading" || node.depth !== 3) continue;

    const heading = node as Heading;
    const parsed = parseFeatureHeading(heading);
    if (!parsed) {
      errors.push(
        `Malformed feature heading at line ${heading.position?.start.line}: "${phrasingToText(heading.children)}"`,
      );
      continue;
    }

    // Collect the list items following this heading
    const listItems: ListItem[] = [];
    for (let j = i + 1; j < featuresEnd; j++) {
      const next = children[j];
      if (next.type === "heading") break;
      if (next.type === "list") {
        const list = next as List;
        listItems.push(...list.children);
      }
    }

    // Extract fields from list items
    let statusValue: string | null = null;
    let featureLabelResult: { text: string; link: Link | null } | null = null;
    let descriptionValue: string | null = null;
    let hasFeatureField = false;

    for (const item of listItems) {
      // Each list item should have a paragraph as its first child
      if (item.children.length === 0 || item.children[0].type !== "paragraph") continue;
      const para = item.children[0] as Paragraph;

      const statusResult = extractLabelValue(para, "Status");
      if (statusResult) {
        statusValue = statusResult.text;
        continue;
      }

      const featureResult = extractLabelValue(para, "Feature");
      if (featureResult) {
        featureLabelResult = featureResult;
        hasFeatureField = true;
        continue;
      }

      const descResult = extractLabelValue(para, "Description");
      if (descResult) {
        descriptionValue = descResult.text;
        continue;
      }
    }

    // Validate required fields
    const featureErrors: string[] = [];

    if (statusValue === null) {
      featureErrors.push(`Feature ${parsed.id} ("${parsed.name}"): missing Status field`);
    }

    if (!hasFeatureField) {
      featureErrors.push(`Feature ${parsed.id} ("${parsed.name}"): missing Feature field`);
    }

    if (descriptionValue === null) {
      featureErrors.push(`Feature ${parsed.id} ("${parsed.name}"): missing Description field`);
    }

    if (featureErrors.length > 0) {
      errors.push(...featureErrors);
      continue;
    }

    // Normalize status
    let status: FeatureStatus;
    try {
      status = normalizeStatus(statusValue!);
    } catch (e) {
      errors.push(
        `Feature ${parsed.id} ("${parsed.name}"): ${(e as Error).message}`,
      );
      continue;
    }

    // Extract feature slug
    let featureSlug: string | null;
    try {
      featureSlug = extractFeatureSlug(featureLabelResult);
    } catch (e) {
      errors.push(
        `Feature ${parsed.id} ("${parsed.name}"): ${(e as Error).message}`,
      );
      continue;
    }

    features.push({
      id: parsed.id,
      name: parsed.name,
      status,
      statusDerived: null,
      featureSlug,
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

  return features;
}
