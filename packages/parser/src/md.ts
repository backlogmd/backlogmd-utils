import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import type { Root } from "mdast";

const parser = unified().use(remarkParse).use(remarkGfm);

export function parseMd(content: string): Root {
  return parser.parse(content);
}
