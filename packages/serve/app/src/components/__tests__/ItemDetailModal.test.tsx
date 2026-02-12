import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { ItemDetailModal } from "../ItemDetailModal";

function makeItem(overrides: Record<string, unknown> = {}) {
  return {
    slug: "001-feat-my-feature",
    name: "My Feature",
    type: "feat" as string | null,
    status: "in-progress",
    tasks: [
      {
        name: "Add login",
        status: "in-progress",
        priority: "002",
        slug: "002-add-login",
        itemSlug: "001-feat-my-feature",
        dependsOn: ["001-setup-project"],
        description: "",
        acceptanceCriteria: [],
        source: "work/001-feat-my-feature/002-add-login.md",
      },
      {
        name: "Setup project",
        status: "done",
        priority: "001",
        slug: "001-setup-project",
        itemSlug: "001-feat-my-feature",
        dependsOn: [],
        description: "",
        acceptanceCriteria: [],
        source: "work/001-feat-my-feature/001-setup-project.md",
      },
    ],
    ...overrides,
  };
}

describe("ItemDetailModal", () => {
  it("renders item name in header", () => {
    const { container } = render(
      <ItemDetailModal
        item={makeItem()}
        onClose={() => {}}
        onTaskStatusChange={() => {}}
        pendingTasks={new Set()}
      />,
    );

    expect(container.textContent).toContain("My Feature");
  });

  it("renders type badge when type is present", () => {
    const { container } = render(
      <ItemDetailModal
        item={makeItem({ type: "feat" })}
        onClose={() => {}}
        onTaskStatusChange={() => {}}
        pendingTasks={new Set()}
      />,
    );

    const badge = container.querySelector("[data-testid='type-badge']");
    expect(badge).not.toBeNull();
    expect(badge!.textContent).toBe("feat");
  });

  it("does not render type badge when type is null", () => {
    const { container } = render(
      <ItemDetailModal
        item={makeItem({ type: null })}
        onClose={() => {}}
        onTaskStatusChange={() => {}}
        pendingTasks={new Set()}
      />,
    );

    const badge = container.querySelector("[data-testid='type-badge']");
    expect(badge).toBeNull();
  });

  it("renders status badge", () => {
    const { container } = render(
      <ItemDetailModal
        item={makeItem({ status: "in-progress" })}
        onClose={() => {}}
        onTaskStatusChange={() => {}}
        pendingTasks={new Set()}
      />,
    );

    expect(container.textContent).toContain("In Progress");
  });

  it("renders all tasks sorted by priority", () => {
    const { container } = render(
      <ItemDetailModal
        item={makeItem()}
        onClose={() => {}}
        onTaskStatusChange={() => {}}
        pendingTasks={new Set()}
      />,
    );

    // Both tasks should be rendered
    expect(container.textContent).toContain("Setup project");
    expect(container.textContent).toContain("Add login");

    // Check order: 001 should come before 002
    const allText = container.textContent!;
    const setupIdx = allText.indexOf("Setup project");
    const loginIdx = allText.indexOf("Add login");
    expect(setupIdx).toBeLessThan(loginIdx);
  });

  it("shows task count", () => {
    const { container } = render(
      <ItemDetailModal
        item={makeItem()}
        onClose={() => {}}
        onTaskStatusChange={() => {}}
        pendingTasks={new Set()}
      />,
    );

    expect(container.textContent).toContain("1/2 done");
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    const { container } = render(
      <ItemDetailModal
        item={makeItem()}
        onClose={onClose}
        onTaskStatusChange={() => {}}
        pendingTasks={new Set()}
      />,
    );

    const closeBtn = container.querySelector("[data-testid='close-button']")!;
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Escape is pressed", () => {
    const onClose = vi.fn();
    render(
      <ItemDetailModal
        item={makeItem()}
        onClose={onClose}
        onTaskStatusChange={() => {}}
        pendingTasks={new Set()}
      />,
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = vi.fn();
    const { container } = render(
      <ItemDetailModal
        item={makeItem()}
        onClose={onClose}
        onTaskStatusChange={() => {}}
        pendingTasks={new Set()}
      />,
    );

    const backdrop = container.querySelector("[data-testid='modal-backdrop']")!;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when footer Close button is clicked", () => {
    const onClose = vi.fn();
    const { container } = render(
      <ItemDetailModal
        item={makeItem()}
        onClose={onClose}
        onTaskStatusChange={() => {}}
        pendingTasks={new Set()}
      />,
    );

    // The footer close button is the one with text "Close"
    const buttons = container.querySelectorAll("button");
    const closeBtn = Array.from(buttons).find(
      (b) => b.textContent === "Close",
    )!;
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("forwards onTaskStatusChange from TaskRow clicks", () => {
    const onChange = vi.fn();
    const { container } = render(
      <ItemDetailModal
        item={makeItem()}
        onClose={() => {}}
        onTaskStatusChange={onChange}
        pendingTasks={new Set()}
      />,
    );

    // The "Add login" task (in-progress) should have a "Mark done" button
    const buttons = container.querySelectorAll("button");
    const markDoneBtn = Array.from(buttons).find(
      (b) => b.textContent === "Mark done",
    )!;
    fireEvent.click(markDoneBtn);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(
      "work/001-feat-my-feature/002-add-login.md",
      "done",
    );
  });

  it("shows 'No tasks' when item has no tasks", () => {
    const { container } = render(
      <ItemDetailModal
        item={makeItem({ tasks: [] })}
        onClose={() => {}}
        onTaskStatusChange={() => {}}
        pendingTasks={new Set()}
      />,
    );

    expect(container.textContent).toContain("No tasks");
  });
});
