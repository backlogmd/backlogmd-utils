import { describe, it, expect, vi } from "vitest";

const FAKE_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head><title>BacklogMD Board</title></head>
<body>
<!--__BACKLOG_DATA__-->
<div id="root"></div>
<script type="module">/* app code */</script>
</body>
</html>`;

vi.mock("node:fs", () => ({
  default: {
    readFileSync: vi.fn(() => FAKE_TEMPLATE),
  },
}));

const { renderHtml } = await import("../src/html.js");

const mockOutput = {
  protocol: "backlogmd/v2",
  generatedAt: "2026-01-01T00:00:00.000Z",
  rootDir: "/test/.backlogmd",
  entries: [
    { slug: "001-feat-user-auth", source: "backlog.md" },
    { slug: "002-feat-dashboard", source: "backlog.md" },
  ],
  items: [
    {
      slug: "001-feat-user-auth",
      tasks: [
        { slug: "001-setup", fileName: "001-setup.md" },
        { slug: "002-login", fileName: "002-login.md" },
      ],
      source: "work/001-feat-user-auth/index.md",
    },
  ],
  tasks: [],
  validation: { errors: [], warnings: [] },
};

describe("html", () => {
  it("replaces the placeholder with a script tag containing data and chat flag", () => {
    const html = renderHtml(mockOutput);
    expect(html).not.toContain("<!--__BACKLOG_DATA__-->");
    expect(html).toContain("<script>window.__BACKLOG__=");
    expect(html).toContain("window.__CHAT_ENABLED__=");
  });

  it("injects valid JSON that round-trips correctly", () => {
    const html = renderHtml(mockOutput);
    const match = html.match(/<script>window\.__BACKLOG__=(.*?)window\.__CHAT_ENABLED__=/s);
    expect(match).not.toBeNull();
    const backlogJson = match![1].replace(/;\s*$/, "");
    const parsed = JSON.parse(backlogJson);
    expect(parsed.protocol).toBe("backlogmd/v2");
    expect(parsed.entries).toHaveLength(2);
    expect(parsed.entries[0].slug).toBe("001-feat-user-auth");
  });

  it("sets __CHAT_ENABLED__ from OPENAI_API_KEY env", () => {
    const html = renderHtml(mockOutput);
    expect(html).toMatch(/window\.__CHAT_ENABLED__=(true|false)/);
  });

  it("preserves the rest of the HTML template", () => {
    const html = renderHtml(mockOutput);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain('<div id="root"></div>');
    expect(html).toContain("</html>");
  });

  it("output is valid HTML with doctype and html tags", () => {
    const html = renderHtml(mockOutput);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html");
    expect(html).toContain("</html>");
  });
});
