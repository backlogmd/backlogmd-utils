import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTaskStatusUpdate } from "../useTaskStatusUpdate";

describe("useTaskStatusUpdate", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("calls PATCH with correct URL and body", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(""),
    });

    const { result } = renderHook(() => useTaskStatusUpdate());

    await act(async () => {
      await result.current.updateTaskStatus(
        "work/001-feat/001-task.md",
        "done",
      );
    });

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(url).toBe(
      `/api/tasks/${encodeURIComponent("work/001-feat/001-task.md")}`,
    );
    expect(options.method).toBe("PATCH");
    expect(options.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(options.body)).toEqual({ status: "done" });
  });

  it("tracks pending tasks during in-flight request", async () => {
    let resolveRequest!: () => void;
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = () =>
          resolve({ ok: true, text: () => Promise.resolve("") });
      }),
    );

    const { result } = renderHook(() => useTaskStatusUpdate());

    // Initially no pending tasks
    expect(result.current.pendingTasks.size).toBe(0);

    let updatePromise: Promise<void>;
    act(() => {
      updatePromise = result.current.updateTaskStatus(
        "work/feat/001.md",
        "done",
      );
    });

    // While in flight, the task source should be pending
    expect(result.current.pendingTasks.has("work/feat/001.md")).toBe(true);

    // Resolve the request
    await act(async () => {
      resolveRequest();
      await updatePromise!;
    });

    // After resolution, pending should be cleared
    expect(result.current.pendingTasks.has("work/feat/001.md")).toBe(false);
  });

  it("clears pending on success", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(""),
    });

    const { result } = renderHook(() => useTaskStatusUpdate());

    await act(async () => {
      await result.current.updateTaskStatus("work/feat/001.md", "done");
    });

    expect(result.current.pendingTasks.size).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it("sets error on failure (non-ok response)", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 404,
      text: () => Promise.resolve("Task not found"),
    });

    const { result } = renderHook(() => useTaskStatusUpdate());

    await act(async () => {
      await result.current.updateTaskStatus("work/feat/999.md", "done");
    });

    expect(result.current.error).toBe("Task not found");
    expect(result.current.pendingTasks.size).toBe(0);
  });

  it("sets error on network failure", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Network error"),
    );

    const { result } = renderHook(() => useTaskStatusUpdate());

    await act(async () => {
      await result.current.updateTaskStatus("work/feat/001.md", "done");
    });

    expect(result.current.error).toBe("Network error");
    expect(result.current.pendingTasks.size).toBe(0);
  });

  it("clears previous error on new request", async () => {
    // First call fails
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve("Server error"),
    });
    // Second call succeeds
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(""),
    });

    const { result } = renderHook(() => useTaskStatusUpdate());

    await act(async () => {
      await result.current.updateTaskStatus("work/feat/001.md", "done");
    });
    expect(result.current.error).toBe("Server error");

    await act(async () => {
      await result.current.updateTaskStatus("work/feat/001.md", "done");
    });
    expect(result.current.error).toBeNull();
  });
});
