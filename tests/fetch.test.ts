import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isUrl, fetchContent } from "@backlogmd/parser";

describe("isUrl", () => {
  it("returns true for http:// URLs", () => {
    expect(isUrl("http://example.com/file.md")).toBe(true);
  });

  it("returns true for https:// URLs", () => {
    expect(isUrl("https://example.com/file.md")).toBe(true);
  });

  it("returns false for local paths", () => {
    expect(isUrl("/path/to/file.md")).toBe(false);
  });

  it("returns false for relative paths", () => {
    expect(isUrl("path/to/file.md")).toBe(false);
  });

  it("returns false for paths with colons", () => {
    expect(isUrl("C:/path/to/file.md")).toBe(false);
  });
});

describe("fetchContent", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches and returns content on success", async () => {
    const mockResponse = {
      ok: true,
      text: async () => "# Markdown content",
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as Response);

    const result = await fetchContent("https://example.com/file.md");
    expect(result).toBe("# Markdown content");
    expect(fetch).toHaveBeenCalledWith("https://example.com/file.md");
  });

  it("throws error on 404", async () => {
    const mockResponse = {
      ok: false,
      status: 404,
      statusText: "Not Found",
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as Response);

    await expect(fetchContent("https://example.com/nonexistent.md")).rejects.toThrow(
      "Failed to fetch https://example.com/nonexistent.md: 404 Not Found",
    );
  });

  it("throws error on network failure", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("Network error"));

    await expect(fetchContent("https://example.com/file.md")).rejects.toThrow(
      "Failed to fetch https://example.com/file.md: Network error",
    );
  });

  it("throws error on server error (500)", async () => {
    const mockResponse = {
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as Response);

    await expect(fetchContent("https://example.com/file.md")).rejects.toThrow(
      "Failed to fetch https://example.com/file.md: 500 Internal Server Error",
    );
  });
});
