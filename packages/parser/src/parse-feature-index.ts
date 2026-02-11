import type {
  Heading,
  List,
  ListItem,
  Table,
  TableRow,
  Link,
  PhrasingContent,
  Text,
} from "mdast";
import { parseMd } from "./md.js";
import type {
  FeatureFolder,
  FeatureFolderStatus,
  TaskStatus,
  TaskStub,
} from "./types.js";

const FEATURE_FOLDER_STATUSES: readonly string[] = ["open", "archived"];
const TASK_STATUSES: readonly string[] = [
  "todo",
  "in-progress",
  "ready-to-review",
  "ready-to-test",
  "done",
];

function textContent(node: PhrasingContent): string {
  if (node.type === "text") return (node as Text).value;
  if ("children" in node) {
    return (node.children as PhrasingContent[]).map(textContent).join("");
  }
  return "";
}

function extractInlineText(nodes: PhrasingContent[]): string {
  return nodes.map(textContent).join("").trim();
}

function parseMetaBullets(
  list: List,
  source: string,
): { status: FeatureFolderStatus; goal: string } {
  let status: FeatureFolderStatus | undefined;
  let goal: string | undefined;

  for (const item of list.children as ListItem[]) {
    const text = extractInlineText(
      (item.children[0] as { children: PhrasingContent[] }).children ?? [],
    );

    const statusMatch = text.match(/^\*{0,2}Status:?\*{0,2}\s*(.+)$/i);
    if (statusMatch) {
      const raw = statusMatch[1].trim().toLowerCase();
      if (!FEATURE_FOLDER_STATUSES.includes(raw)) {
        throw new Error(
          `Invalid feature status "${raw}" in ${source}. Expected one of: ${FEATURE_FOLDER_STATUSES.join(", ")}`,
        );
      }
      status = raw as FeatureFolderStatus;
      continue;
    }

    const goalMatch = text.match(/^\*{0,2}Goal:?\*{0,2}\s*(.+)$/i);
    if (goalMatch) {
      goal = goalMatch[1].trim();
      continue;
    }
  }

  if (status === undefined) {
    throw new Error(`Missing "Status" metadata in ${source}`);
  }
  if (goal === undefined) {
    throw new Error(`Missing "Goal" metadata in ${source}`);
  }

  return { status, goal };
}

function parseDependsOn(raw: string): string[] {
  const trimmed = raw.trim();
  if (trimmed === "—" || trimmed === "-" || trimmed === "" || trimmed === "–") {
    return [];
  }
  return trimmed
    .split(/,\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseOwner(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed === "—" || trimmed === "-" || trimmed === "" || trimmed === "–") {
    return null;
  }
  return trimmed;
}

function parseTaskRow(row: TableRow, source: string): TaskStub {
  const cells = row.children;
  if (cells.length < 5) {
    throw new Error(
      `Task table row has ${cells.length} columns, expected 5 in ${source}`,
    );
  }

  const priorityText = extractInlineText(cells[0].children as PhrasingContent[]);
  const priority = priorityText.trim();

  // The task cell should contain a link: [Task name](filename.md)
  const taskCell = cells[1];
  let name: string;
  let fileName: string;

  const link = findLink(taskCell.children as PhrasingContent[]);
  if (link) {
    name = extractInlineText(link.children as PhrasingContent[]);
    fileName = link.url;
  } else {
    throw new Error(
      `Task table row missing link in task column in ${source}`,
    );
  }

  const statusText = extractInlineText(cells[2].children as PhrasingContent[])
    .trim()
    .toLowerCase();
  if (!TASK_STATUSES.includes(statusText)) {
    throw new Error(
      `Invalid task status "${statusText}" in ${source}. Expected one of: ${TASK_STATUSES.join(", ")}`,
    );
  }
  const status = statusText as TaskStatus;

  const ownerText = extractInlineText(cells[3].children as PhrasingContent[]);
  const owner = parseOwner(ownerText);

  const dependsText = extractInlineText(cells[4].children as PhrasingContent[]);
  const dependsOn = parseDependsOn(dependsText);

  return { priority, name, fileName, status, owner, dependsOn };
}

function findLink(nodes: PhrasingContent[]): Link | null {
  for (const node of nodes) {
    if (node.type === "link") return node as Link;
    if ("children" in node) {
      const found = findLink((node as { children: PhrasingContent[] }).children);
      if (found) return found;
    }
  }
  return null;
}

export function parseFeatureIndex(
  content: string,
  slug: string,
  source: string,
): FeatureFolder {
  const tree = parseMd(content);
  const children = tree.children;

  // 1. Find the h1 heading "# Feature: <name>"
  const h1 = children.find(
    (n) => n.type === "heading" && (n as Heading).depth === 1,
  ) as Heading | undefined;

  if (!h1) {
    throw new Error(`Missing "# Feature: ..." heading in ${source}`);
  }

  const headingText = extractInlineText(h1.children as PhrasingContent[]);
  const featureMatch = headingText.match(/^Feature:\s*(.+)$/i);
  if (!featureMatch) {
    throw new Error(
      `Heading must start with "Feature: " in ${source}, got "${headingText}"`,
    );
  }
  const name = featureMatch[1].trim();

  // 2. Find the metadata bullet list (first list after h1)
  const h1Index = children.indexOf(h1);
  let metaList: List | undefined;
  for (let i = h1Index + 1; i < children.length; i++) {
    const node = children[i];
    if (node.type === "list") {
      metaList = node as List;
      break;
    }
    if (node.type === "heading") break;
  }

  if (!metaList) {
    throw new Error(`Missing metadata bullet list after heading in ${source}`);
  }

  const { status, goal } = parseMetaBullets(metaList, source);

  // 3. Find the "## Tasks" section and its table
  let tasksTable: Table | undefined;
  let foundTasksHeading = false;

  for (let i = 0; i < children.length; i++) {
    const node = children[i];
    if (
      node.type === "heading" &&
      (node as Heading).depth === 2 &&
      extractInlineText((node as Heading).children as PhrasingContent[])
        .toLowerCase() === "tasks"
    ) {
      foundTasksHeading = true;
      // Look for table after this heading
      for (let j = i + 1; j < children.length; j++) {
        if (children[j].type === "table") {
          tasksTable = children[j] as Table;
          break;
        }
        if (children[j].type === "heading") break;
      }
      break;
    }
  }

  if (!foundTasksHeading) {
    throw new Error(`Missing "## Tasks" section in ${source}`);
  }

  if (!tasksTable) {
    throw new Error(`Missing tasks table under "## Tasks" in ${source}`);
  }

  // Parse table rows (skip the header row which is row[0])
  const rows = tasksTable.children as TableRow[];
  const tasks: TaskStub[] = [];

  for (let i = 1; i < rows.length; i++) {
    tasks.push(parseTaskRow(rows[i], source));
  }

  return { slug, name, status, goal, tasks, source };
}
