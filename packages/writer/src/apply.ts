import fs from "node:fs";
import path from "node:path";
import type { Changeset, FileCache } from "./types.js";

/**
 * Apply a changeset to the filesystem.
 *
 * For each patch, reads the current file content (from cache or disk),
 * verifies the original text still exists (guards against stale patches),
 * applies the replacement, and writes the file back.
 *
 * @param rootDir   - Absolute path to the .backlogmd/ directory
 * @param changeset - The changeset to apply
 * @param cache     - Optional file cache to update in-place after writing
 *
 * @throws If a patch's original text is not found in the target file
 *         (indicates the file was modified since the changeset was computed)
 */
export async function applyChangeset(
  rootDir: string,
  changeset: Changeset,
  cache?: FileCache,
): Promise<void> {
  // Group patches by file so we apply all patches to a file in one pass
  const patchesByFile = new Map<string, typeof changeset.patches>();

  for (const patch of changeset.patches) {
    const existing = patchesByFile.get(patch.filePath) ?? [];
    existing.push(patch);
    patchesByFile.set(patch.filePath, existing);
  }

  for (const [filePath, patches] of patchesByFile) {
    const absPath = path.join(rootDir, filePath);

    // Read current content from cache or disk
    let content = cache?.get(filePath) ?? fs.readFileSync(absPath, "utf-8");

    // Apply each patch sequentially
    for (const patch of patches) {
      if (!content.includes(patch.original)) {
        throw new Error(
          `Stale patch for "${filePath}": expected text not found.\n` +
            `  Description: ${patch.description}\n` +
            `  Expected: ${JSON.stringify(patch.original)}`,
        );
      }
      content = content.replace(patch.original, patch.replacement);
    }

    // Write back to disk
    fs.writeFileSync(absPath, content, "utf-8");

    // Update cache if provided
    if (cache) {
      cache.set(filePath, content);
    }
  }
}
