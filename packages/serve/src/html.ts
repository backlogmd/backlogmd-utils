import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { BacklogOutput } from "@backlogmd/parser";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const templatePath = path.resolve(__dirname, "..", "app", "dist", "index.html");
const template = fs.readFileSync(templatePath, "utf-8");

const PLACEHOLDER = "<!--__BACKLOG_DATA__-->";

export function renderHtml(output: BacklogOutput): string {
  const script = `<script>window.__BACKLOG__=${JSON.stringify(output)}</script>`;
  return template.replace(PLACEHOLDER, script);
}
