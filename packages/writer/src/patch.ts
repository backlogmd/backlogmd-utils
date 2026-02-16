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

/**
 * Patch or add a metadata field in a SPEC v4 item index (work/<slug>/index.md).
 * The METADATA section has no closing tag; it ends at the next "<!--".
 * If the field exists, its value is replaced; otherwise the field is added after "status:".
 */
export function patchItemIndexMetadataField(
  content: string,
  field: string,
  newValue: string,
): { patched: string; original: string; replacement: string } {
  const metaStart = content.indexOf("<!-- METADATA -->");
  if (metaStart === -1) throw new Error("METADATA section not found in content");

  const afterMeta = content.slice(metaStart + "<!-- METADATA -->".length);
  const nextComment = afterMeta.indexOf("<!--");
  const metaSectionEnd =
    nextComment === -1
      ? content.length
      : metaStart + "<!-- METADATA -->".length + nextComment;
  const metaSection = content.slice(metaStart, metaSectionEnd);

  const escapedField = escapeRegExp(field);
  const existingPattern = new RegExp(`^(${escapedField}:\\s*).+$`, "m");
  const match = metaSection.match(existingPattern);

  if (match) {
    const original = match[0];
    const replacement = `${match[1]}${newValue}`;
    const patchedSection = metaSection.replace(original, replacement);
    const patched = content.replace(metaSection, patchedSection);
    return { patched, original, replacement };
  }

  // Add field after status: line (or after the closing ``` of yaml block we don't touch)
  const statusPattern = /^(status:\s*[\w-]+)\s*$/m;
  const statusMatch = metaSection.match(statusPattern);
  const insertAfter = statusMatch ? statusMatch[0] : "```";
  const newLine = `\n${field}: ${newValue}`;
  const patchedSection = metaSection.replace(insertAfter, insertAfter + newLine);
  const patched = content.replace(metaSection, patchedSection);
  return { patched, original: insertAfter, replacement: insertAfter + newLine };
}
