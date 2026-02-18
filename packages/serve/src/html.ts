import fs from "node:fs";
import path from "path";
import { fileURLToPath } from "url";
import type { BacklogStateDto } from "@backlogmd/types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const templatePath = path.resolve(__dirname, "..", "app", "dist", "index.html");

const PLACEHOLDER = "<!--__BACKLOG_DATA__-->";

/** In development, read template on each request so app rebuilds (e.g. vite --watch) are picked up without restarting the server. */
function getTemplate(): string {
  if (process.env.NODE_ENV === "development" && fs.existsSync(templatePath)) {
    return fs.readFileSync(templatePath, "utf-8");
  }
  return cachedTemplate;
}

let cachedTemplate: string;
try {
  cachedTemplate = fs.readFileSync(templatePath, "utf-8");
} catch {
  cachedTemplate = "";
}

export function renderHtml(doc: BacklogStateDto): string {
  const template = getTemplate();
  const chatEnabled = Boolean(process.env.OPENAI_API_KEY?.trim());
  const script = `<script>window.__BACKLOG__=${JSON.stringify(doc)};window.__CHAT_ENABLED__=${JSON.stringify(chatEnabled)}</script>`;
  return template.replace(PLACEHOLDER, script);
}
