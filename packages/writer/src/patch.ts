/**
 * Surgical patching primitives for BacklogMD SPEC v2 markdown files.
 *
 * SPEC v2 uses fenced code blocks inside HTML comment sections for metadata:
 *
 * <!-- METADATA -->
 * ```
 * Task: Task Name
 * Status: open
 * Priority: 001
 * DependsOn: —
 * ```
 * <!-- /METADATA -->
 */

/**
 * Escape a string for use in a RegExp.
 */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Patch a metadata field inside a SPEC v2 task file.
 *
 * Locates the field within the <!-- METADATA --> section's fenced code block
 * and replaces its value.
 *
 * Matches lines like:
 *   Status: open
 *   Priority: 001
 *
 * @param content  - The full file content
 * @param field    - The field name (e.g. "Status")
 * @param newValue - The new value to set
 * @returns The patched content with original/replacement strings
 *
 * @throws If the METADATA section is not found
 * @throws If the field is not found in the metadata
 */
export function patchMetadataField(
  content: string,
  field: string,
  newValue: string,
): { patched: string; original: string; replacement: string } {
  // Find the METADATA section boundaries
  const metaStart = content.indexOf("<!-- METADATA -->");
  const metaEnd = content.indexOf("<!-- /METADATA -->");

  if (metaStart === -1 || metaEnd === -1) {
    throw new Error("METADATA section not found in content");
  }

  const metaSection = content.slice(
    metaStart,
    metaEnd + "<!-- /METADATA -->".length,
  );

  // Find the field within the metadata section
  const escapedField = escapeRegExp(field);
  const pattern = new RegExp(`^(${escapedField}:\\s*).+$`, "m");
  const match = metaSection.match(pattern);

  if (!match) {
    throw new Error(
      `Field "${field}" not found in METADATA section`,
    );
  }

  const original = match[0];
  const replacement = `${match[1]}${newValue}`;
  const patchedSection = metaSection.replace(original, replacement);
  const patched = content.replace(metaSection, patchedSection);

  return { patched, original, replacement };
}
