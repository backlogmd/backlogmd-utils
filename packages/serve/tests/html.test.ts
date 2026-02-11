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
  protocol: "backlogmd/v1",
  generatedAt: "2026-01-01T00:00:00.000Z",
  rootDir: "/test/.backlogmd",
  features: [
    {
      id: "001",
      name: "User Auth",
      status: "in-progress" as const,
      statusDerived: "in-progress" as const,
      featureSlug: "user-auth",
      description: "Add user authentication",
      taskRefs: ["user-auth/001", "user-auth/002"],
      source: "backlog.md",
    },
    {
      id: "002",
      name: "Dashboard",
      status: "todo" as const,
      statusDerived: "todo" as const,
      featureSlug: "dashboard",
      description: "Build dashboard",
      taskRefs: [],
      source: "backlog.md",
    },
  ],
  featureFolders: [
    {
      slug: "user-auth",
      name: "User Auth",
      status: "open" as const,
      goal: "Add user auth",
      tasks: [
        {
          priority: "001",
          name: "Setup",
          fileName: "001-setup.md",
          status: "done" as const,
          owner: "@alice",
          dependsOn: [],
        },
        {
          priority: "002",
          name: "Login",
          fileName: "002-login.md",
          status: "in-progress" as const,
          owner: "@bob",
          dependsOn: ["001"],
        },
      ],
      source: "features/user-auth/index.md",
    },
  ],
  tasks: [],
  validation: { errors: [], warnings: [] },
};

describe("html", () => {
  it("replaces the placeholder with a script tag containing data", () => {
    const html = renderHtml(mockOutput);
    expect(html).not.toContain("<!--__BACKLOG_DATA__-->");
    expect(html).toContain("<script>window.__BACKLOG__=");
  });

  it("injects valid JSON that round-trips correctly", () => {
    const html = renderHtml(mockOutput);
    const match = html.match(
      /<script>window\.__BACKLOG__=(.*?)<\/script>/,
    );
    expect(match).not.toBeNull();
    const parsed = JSON.parse(match![1]);
    expect(parsed.protocol).toBe("backlogmd/v1");
    expect(parsed.features).toHaveLength(2);
    expect(parsed.features[0].name).toBe("User Auth");
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
