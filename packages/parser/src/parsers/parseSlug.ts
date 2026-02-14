import type { ItemType } from "../types.js";

const SLUG_TYPE_RE = /^\d+-(feat|fix|refactor|chore)-/;

/**
 * Extract the Conventional Commits type from an item slug.
 *
 * Given a slug like "001-feat-user-auth", returns "feat".
 * Returns null if the slug has no recognized type segment.
 */
export function parseItemType(slug: string): ItemType | null {
  const m = slug.match(SLUG_TYPE_RE);
  return m ? (m[1] as ItemType) : null;
}
