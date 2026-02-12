/**
 * Surgical patching primitives for BacklogMD markdown files.
 *
 * These functions locate specific fields in markdown text and replace
 * their values without touching any other content.
 */

/**
 * Escape a string for use in a RegExp.
 */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Patch a metadata field in a markdown file.
 *
 * Matches lines like:
 *   - **Status:** todo
 *   - **Type:** feature
 *
 * @param content  - The full file content
 * @param field    - The field name (e.g. "Status")
 * @param newValue - The new value to set
 * @returns The patched content, or the original if the field was not found
 *
 * @throws If the field is not found in the content
 */
export function patchMetadataField(
  content: string,
  field: string,
  newValue: string,
): { patched: string; original: string; replacement: string } {
  const escapedField = escapeRegExp(field);
  // Match: - **Field:** <value> (with optional trailing whitespace)
  const pattern = new RegExp(
    `^(- \\*\\*${escapedField}:\\*\\*\\s+).+$`,
    "m",
  );

  const match = content.match(pattern);
  if (!match) {
    throw new Error(
      `Field "**${field}:**" not found in content`,
    );
  }

  const original = match[0];
  const replacement = `${match[1]}${newValue}`;
  const patched = content.replace(original, replacement);

  return { patched, original, replacement };
}

/**
 * Patch a cell in a GFM markdown table.
 *
 * Finds the row whose first cell matches `rowId` (trimmed),
 * then replaces the cell at `colIndex` (0-based) with `newValue`.
 *
 * Example table row:
 *   | 003 | [Task name](003-task.md) | todo | — | — |
 *
 * @param content  - The full file content
 * @param rowId    - Value to match in the first column (e.g. "003")
 * @param colIndex - 0-based column index to patch
 * @param newValue - The new cell value
 * @returns The patched content with original/replacement strings
 *
 * @throws If the row or column is not found
 */
export function patchTableCell(
  content: string,
  rowId: string,
  colIndex: number,
  newValue: string,
): { patched: string; original: string; replacement: string } {
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip non-table lines and separator rows
    if (!line.startsWith("|")) continue;
    if (/^\|\s*-/.test(line)) continue;

    // Split into cells (remove leading/trailing empty strings from split)
    const cells = line
      .split("|")
      .slice(1, -1); // remove empty first and last from "| a | b |".split("|")

    if (cells.length === 0) continue;

    // Check if first cell matches the rowId
    const firstCell = cells[0].trim();
    if (firstCell !== rowId) continue;

    // Found the row — validate column index
    if (colIndex < 0 || colIndex >= cells.length) {
      throw new Error(
        `Column index ${colIndex} out of range (row has ${cells.length} columns)`,
      );
    }

    // Reconstruct the cell with the same padding style
    const oldCell = cells[colIndex];
    // Detect leading/trailing whitespace pattern from the original cell
    const leadingSpace = oldCell.match(/^(\s*)/)?.[1] ?? " ";
    const trailingSpace = oldCell.match(/(\s*)$/)?.[1] ?? " ";
    const newCell = `${leadingSpace}${newValue}${trailingSpace}`;

    // Rebuild the line
    const newCells = [...cells];
    newCells[colIndex] = newCell;
    const newLine = `|${newCells.join("|")}|`;

    const original = line;
    const replacement = newLine;
    const patched = content.replace(line, newLine);

    return { patched, original, replacement };
  }

  throw new Error(`Table row with id "${rowId}" not found`);
}
