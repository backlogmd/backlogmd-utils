import type {
  Manifest,
  ManifestItem,
  ManifestTask,
  ManifestItemStatus,
  TaskStatus,
  ValidationIssue,
} from "../types.js";

const VALID_TASK_STATUSES: TaskStatus[] = [
  "plan",
  "open",
  "reserved",
  "ip",
  "review",
  "block",
  "done",
];

const VALID_ITEM_STATUSES: ManifestItemStatus[] = ["open", "archived"];

export interface ManifestParseResult {
  manifest: Manifest;
  warnings: ValidationIssue[];
}

/**
 * Parse and validate a manifest.json file.
 *
 * Validates the structure, required fields, and field types per SPEC v3.
 * Returns the parsed manifest along with any validation warnings.
 * Throws on invalid JSON or missing required top-level fields.
 */
export function parseManifest(
  content: string,
  source: string,
): ManifestParseResult {
  const warnings: ValidationIssue[] = [];

  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch (err) {
    throw new Error(
      `Invalid JSON in ${source}: ${(err as Error).message}`,
    );
  }

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(`${source} must be a JSON object`);
  }

  const obj = raw as Record<string, unknown>;

  // Required top-level fields
  const specVersion = requireString(obj, "specVersion", source);
  const updatedAt = requireString(obj, "updatedAt", source);
  const openItemCount =
    typeof obj["openItemCount"] === "number" ? obj["openItemCount"] : 0;

  if (!Array.isArray(obj["items"])) {
    throw new Error(`${source} missing "items" array`);
  }

  const items: ManifestItem[] = [];
  for (let i = 0; i < (obj["items"] as unknown[]).length; i++) {
    const rawItem = (obj["items"] as unknown[])[i];
    const itemResult = parseManifestItem(rawItem, i, source, warnings);
    if (itemResult) {
      items.push(itemResult);
    }
  }

  // Validate openItemCount matches
  const actualOpen = items.filter((it) => it.status === "open").length;
  if (openItemCount !== actualOpen) {
    warnings.push({
      code: "MANIFEST_OPEN_COUNT_MISMATCH",
      message: `openItemCount is ${openItemCount} but ${actualOpen} items have status "open"`,
      source,
    });
  }

  return {
    manifest: { specVersion, updatedAt, openItemCount, items },
    warnings,
  };
}

function parseManifestItem(
  raw: unknown,
  index: number,
  source: string,
  warnings: ValidationIssue[],
): ManifestItem | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    warnings.push({
      code: "MANIFEST_INVALID_ITEM",
      message: `items[${index}] is not a valid object`,
      source,
    });
    return null;
  }

  const obj = raw as Record<string, unknown>;

  const id = typeof obj["id"] === "string" ? obj["id"] : "";
  const slug = typeof obj["slug"] === "string" ? obj["slug"] : "";
  const itemPath = typeof obj["path"] === "string" ? obj["path"] : "";
  const updated = typeof obj["updated"] === "string" ? obj["updated"] : "";

  if (!id) {
    warnings.push({
      code: "MANIFEST_ITEM_MISSING_ID",
      message: `items[${index}] missing "id" field`,
      source,
    });
  }

  // Validate item status
  const statusRaw = typeof obj["status"] === "string" ? obj["status"] : "open";
  let status: ManifestItemStatus = "open";
  if (VALID_ITEM_STATUSES.includes(statusRaw as ManifestItemStatus)) {
    status = statusRaw as ManifestItemStatus;
  } else {
    warnings.push({
      code: "MANIFEST_INVALID_ITEM_STATUS",
      message: `items[${index}] has invalid status "${statusRaw}"`,
      source,
    });
  }

  // Parse tasks
  const tasks: ManifestTask[] = [];
  if (Array.isArray(obj["tasks"])) {
    for (let j = 0; j < (obj["tasks"] as unknown[]).length; j++) {
      const rawTask = (obj["tasks"] as unknown[])[j];
      const task = parseManifestTask(rawTask, index, j, source, warnings);
      if (task) {
        tasks.push(task);
      }
    }
  }

  return { id, slug, path: itemPath, status, updated, tasks };
}

function parseManifestTask(
  raw: unknown,
  itemIndex: number,
  taskIndex: number,
  source: string,
  warnings: ValidationIssue[],
): ManifestTask | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    warnings.push({
      code: "MANIFEST_INVALID_TASK",
      message: `items[${itemIndex}].tasks[${taskIndex}] is not a valid object`,
      source,
    });
    return null;
  }

  const obj = raw as Record<string, unknown>;

  const tid = typeof obj["tid"] === "string" ? obj["tid"] : "";
  const slug = typeof obj["slug"] === "string" ? obj["slug"] : "";
  const file = typeof obj["file"] === "string" ? obj["file"] : "";
  const t = typeof obj["t"] === "string" ? obj["t"] : "";
  const p = typeof obj["p"] === "number" ? obj["p"] : 0;
  const a = typeof obj["a"] === "string" ? obj["a"] : "";
  const h = obj["h"] === true;
  const expiresAt =
    typeof obj["expiresAt"] === "string" ? obj["expiresAt"] : null;

  // Validate task status
  const sRaw = typeof obj["s"] === "string" ? obj["s"] : "";
  let s: TaskStatus = "open";
  if (VALID_TASK_STATUSES.includes(sRaw as TaskStatus)) {
    s = sRaw as TaskStatus;
  } else {
    warnings.push({
      code: "MANIFEST_INVALID_TASK_STATUS",
      message: `items[${itemIndex}].tasks[${taskIndex}] has invalid status "${sRaw}"`,
      source,
    });
  }

  // Parse dep — must be string array
  let dep: string[] = [];
  if (Array.isArray(obj["dep"])) {
    dep = (obj["dep"] as unknown[]).map((d) => String(d));
  }

  // Validate done tasks have empty agent
  if (s === "done" && a !== "") {
    warnings.push({
      code: "MANIFEST_DONE_TASK_HAS_AGENT",
      message: `items[${itemIndex}].tasks[${taskIndex}] (tid "${tid}") is done but "a" is not empty`,
      source,
    });
  }

  return { tid, slug, file, t, s, p, dep, a, h, expiresAt };
}

function requireString(
  obj: Record<string, unknown>,
  field: string,
  source: string,
): string {
  const val = obj[field];
  if (typeof val !== "string" || !val) {
    throw new Error(`${source} missing required field "${field}"`);
  }
  return val;
}
