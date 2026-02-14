/**
 * Surgical patching primitives for BacklogMD SPEC v3 markdown files.
 *
 * SPEC v3 uses HTML comment markers with a YAML fenced code block for metadata:
 *
 * <!-- METADATA -->
 * ```yaml
 * t: Task Name
 * s: open
 * p: 001
 * dep: ["001"]
 * a: ""
 * h: false
 * expiresAt: null
 * ```
 * <!-- DESCRIPTION -->
 */

import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

/**
 * Patch a metadata field inside a SPEC v3 task file.
 *
 * Locates the field within the <!-- METADATA --> section's YAML fenced code block
 * and replaces its value.
 *
 * SPEC v3 uses YAML with short keys:
 *   t: Task Name
 *   s: open
 *   p: 001
 *   dep: ["001"]
 *   a: ""
 *   h: false
 *   expiresAt: null
 *
 * @param content  - The full file content
 * @param field    - The YAML key (t, s, p, dep, a, h, expiresAt)
 * @param newValue - The new value to set
 * @returns The patched content with original/replacement strings
 *
 * @throws If the METADATA section is not found
 * @throws If the YAML code block is not found or invalid
 */
export function patchMetadataField(
  content: string,
  field: string,
  newValue: unknown,
): { patched: string; original: string; replacement: string } {
  // Find the METADATA section boundaries (no closing tag in v3)
  const metaStart = content.indexOf("<!-- METADATA -->");
  const descStart = content.indexOf("<!-- DESCRIPTION -->");

  if (metaStart === -1) {
    throw new Error("METADATA section not found in content");
  }
  if (descStart === -1) {
    throw new Error("DESCRIPTION section not found in content");
  }

  const metaSection = content.slice(metaStart + "<!-- METADATA -->".length, descStart);

  // Extract the YAML code block
  const codeMatch = metaSection.match(/```(?:yaml)?\s*\n([\s\S]*?)```/);
  if (!codeMatch) {
    throw new Error("YAML code block not found in METADATA section");
  }

  const yamlContent = codeMatch[1];
  let parsed: Record<string, unknown>;
  try {
    parsed = parseYaml(yamlContent) as Record<string, unknown>;
  } catch (err) {
    throw new Error(`Invalid YAML in metadata block: ${(err as Error).message}`);
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Metadata block is not a valid YAML mapping");
  }

  // Get old value for the original string
  const oldValue = parsed[field];
  const oldValueStr = stringifyValue(oldValue);
  const newValueStr = stringifyValue(newValue);

  // Build the new YAML
  parsed[field] = newValue;
  const newYamlContent = stringifyYaml(parsed, { lineWidth: 0 });

  // Find and replace the old YAML in the section
  const original = codeMatch[0];
  const replacement = original.replace(yamlContent, newYamlContent);
  const patchedSection = metaSection.replace(original, replacement);
  const patched =
    content.slice(0, metaStart + "<!-- METADATA -->".length) +
    patchedSection +
    content.slice(descStart);

  return {
    patched,
    original: `${field}: ${oldValueStr}`,
    replacement: `${field}: ${newValueStr}`,
  };
}

function stringifyValue(value: unknown): string {
  if (value === null) return "null";
  if (value === true) return "true";
  if (value === false) return "false";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return `[${value.map((v) => (typeof v === "string" ? `"${v}"` : String(v))).join(", ")}]`;
  }
  return String(value);
}
