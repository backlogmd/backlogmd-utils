import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TaskRow } from "../TaskRow";

function makeTask(overrides: Record<string, unknown> = {}) {
  return {
    name: "Setup project",
    status: "open",
    priority: "001",
    slug: "001-setup-project",
    itemSlug: "001-feat-my-feature",
    ...overrides,
  };
}

describe("TaskRow", () => {
  it("renders task name and status badge", () => {
    const { container } = render(
      <TaskRow task={makeTask()} onStatusChange={() => {}} isPending={false} />,
    );

    expect(container.textContent).toContain("Setup project");
    expect(container.textContent).toContain("Open");
  });

  it("renders priority number", () => {
    const { container } = render(
      <TaskRow task={makeTask()} onStatusChange={() => {}} isPending={false} />,
    );

    expect(container.textContent).toContain("001");
  });

  it('shows "Mark done" button when status is not "done"', () => {
    const { container } = render(
      <TaskRow
        task={makeTask({ status: "open" })}
        onStatusChange={() => {}}
        isPending={false}
      />,
    );

    const btn = container.querySelector("button");
    expect(btn).not.toBeNull();
    expect(btn!.textContent).toBe("Mark done");
  });

  it('shows "Mark done" for in-progress tasks', () => {
    const { container } = render(
      <TaskRow
        task={makeTask({ status: "in-progress" })}
        onStatusChange={() => {}}
        isPending={false}
      />,
    );

    const btn = container.querySelector("button");
    expect(btn).not.toBeNull();
    expect(btn!.textContent).toBe("Mark done");
  });

  it('does not show action button when status is "done"', () => {
    const { container } = render(
      <TaskRow
        task={makeTask({ status: "done" })}
        onStatusChange={() => {}}
        isPending={false}
      />,
    );

    const btn = container.querySelector("button");
    expect(btn).toBeNull();

    const checkmark = container.querySelector("[aria-label='Completed']");
    expect(checkmark).not.toBeNull();
  });

  it("calls onStatusChange with taskId (itemSlug/priority) on click", () => {
    const onChange = vi.fn();
    const { container } = render(
      <TaskRow
        task={makeTask({ itemSlug: "work/feat", priority: "001-task" })}
        onStatusChange={onChange}
        isPending={false}
      />,
    );

    const btn = container.querySelector("button")!;
    fireEvent.click(btn);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("work/feat/001-task", "done");
  });

  it('shows "Saving..." and disables button when isPending is true', () => {
    const { container } = render(
      <TaskRow
        task={makeTask()}
        onStatusChange={() => {}}
        isPending={true}
      />,
    );

    const btn = container.querySelector("button")!;
    expect(btn.textContent).toBe("Saving...");
    expect(btn.disabled).toBe(true);
  });
});
