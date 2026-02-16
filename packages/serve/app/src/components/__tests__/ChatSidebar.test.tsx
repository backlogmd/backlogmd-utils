import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { ChatSidebar } from "../ChatSidebar";

function mockChatApi(content: string) {
  return vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ message: { role: "assistant" as const, content } }),
    } as Response),
  );
}

function getWithinFirstSidebar(container: HTMLElement) {
  const sidebar = container.querySelector("[data-testid='chat-sidebar']");
  return sidebar ?? container;
}

describe("ChatSidebar", () => {
  beforeEach(() => {
    global.fetch = mockChatApi("Mocked reply");
  });

  it("renders the sidebar with Chat heading", () => {
    const { container } = render(<ChatSidebar />);
    const root = getWithinFirstSidebar(container);
    expect(root.querySelector("[data-testid='chat-sidebar']") ?? root).toBeTruthy();
    expect(root.textContent).toContain("Chat");
  });

  it("renders the message list area", () => {
    const { container } = render(<ChatSidebar />);
    const root = getWithinFirstSidebar(container);
    expect(root.querySelector("[data-testid='chat-message-list']")).toBeTruthy();
  });

  it("shows empty state when there are no messages", () => {
    const { container } = render(<ChatSidebar />);
    const root = getWithinFirstSidebar(container);
    expect(root.querySelector("[data-testid='chat-empty-state']")).toBeTruthy();
    expect(root.textContent).toMatch(/No messages yet/);
  });

  it("renders textarea and send button at the bottom", () => {
    const { container } = render(<ChatSidebar />);
    const root = getWithinFirstSidebar(container);
    expect(root.querySelector("[data-testid='chat-input']")).toBeTruthy();
    expect(root.querySelector("[data-testid='chat-send-button']")).toBeTruthy();
    const btn = root.querySelector("button");
    expect(btn?.textContent).toBe("Send message");
    const textarea = root.querySelector("textarea");
    expect(textarea?.getAttribute("placeholder")).toBe("Type a message...");
  });

  it("send button is disabled when input is empty", () => {
    const { container } = render(<ChatSidebar />);
    const sendBtn = container.querySelector<HTMLButtonElement>("[data-testid='chat-send-button']");
    expect(sendBtn).toBeTruthy();
    expect(sendBtn!.disabled).toBe(true);
  });

  it("send button is disabled when input is only whitespace", () => {
    const { container } = render(<ChatSidebar />);
    const input = container.querySelector<HTMLTextAreaElement>("[data-testid='chat-input']")!;
    fireEvent.change(input, { target: { value: "   " } });
    const sendBtn = container.querySelector<HTMLButtonElement>("[data-testid='chat-send-button']");
    expect(sendBtn!.disabled).toBe(true);
  });

  it("send button is enabled when input has text", () => {
    const { container } = render(<ChatSidebar />);
    const input = container.querySelector<HTMLTextAreaElement>("[data-testid='chat-input']")!;
    fireEvent.change(input, { target: { value: "Hello" } });
    const sendBtn = container.querySelector<HTMLButtonElement>("[data-testid='chat-send-button']");
    expect(sendBtn!.disabled).toBe(false);
  });

  it("clicking send adds a user message to the list and clears the input", async () => {
    const { container } = render(<ChatSidebar />);
    const input = container.querySelector<HTMLTextAreaElement>("[data-testid='chat-input']")!;
    const sendBtn = container.querySelector<HTMLButtonElement>("[data-testid='chat-send-button']")!;

    fireEvent.change(input, { target: { value: "First message" } });
    fireEvent.click(sendBtn);

    expect(container.querySelector("[data-testid='chat-empty-state']")).toBeNull();
    const userMessages = container.querySelectorAll("[data-testid='chat-message-user']");
    expect(userMessages.length).toBe(1);
    expect(userMessages[0].textContent).toBe("First message");
    expect(input.value).toBe("");
    await waitFor(() => {
      expect(container.querySelector("[data-testid='chat-message-assistant']")).toBeTruthy();
      expect(container.querySelector("[data-testid='chat-message-assistant']")?.textContent).toBe("Mocked reply");
    });
  });

  it("sending multiple messages appends each to the list", async () => {
    const { container } = render(<ChatSidebar />);
    const input = container.querySelector<HTMLTextAreaElement>("[data-testid='chat-input']")!;
    const sendBtn = container.querySelector<HTMLButtonElement>("[data-testid='chat-send-button']")!;

    fireEvent.change(input, { target: { value: "One" } });
    fireEvent.click(sendBtn);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-testid='chat-message-user']").length).toBe(1);
    });
    fireEvent.change(input, { target: { value: "Two" } });
    fireEvent.click(sendBtn);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-testid='chat-message-user']").length).toBe(2);
    });

    const userMessages = container.querySelectorAll("[data-testid='chat-message-user']");
    expect(userMessages.length).toBe(2);
    expect(userMessages[0].textContent).toBe("One");
    expect(userMessages[1].textContent).toBe("Two");
  });

  it("pressing Enter without Shift sends the message", async () => {
    const { container } = render(<ChatSidebar />);
    const input = container.querySelector<HTMLTextAreaElement>("[data-testid='chat-input']")!;
    fireEvent.change(input, { target: { value: "Enter send" } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: false });

    const userMessages = container.querySelectorAll("[data-testid='chat-message-user']");
    expect(userMessages.length).toBe(1);
    expect(userMessages[0].textContent).toBe("Enter send");
    expect(input.value).toBe("");
    await waitFor(() => {
      expect(container.querySelector("[data-testid='chat-message-assistant']")).toBeTruthy();
    });
  });

  it("pressing Shift+Enter does not send (allows newline)", () => {
    const { container } = render(<ChatSidebar />);
    const input = container.querySelector<HTMLTextAreaElement>("[data-testid='chat-input']")!;
    fireEvent.change(input, { target: { value: "Line one" } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });

    expect(container.querySelectorAll("[data-testid='chat-message-user']").length).toBe(0);
    expect(input.value).toBe("Line one");
  });

  it("send does nothing when input is empty", () => {
    const { container } = render(<ChatSidebar />);
    const sendBtn = container.querySelector<HTMLButtonElement>("[data-testid='chat-send-button']")!;
    fireEvent.click(sendBtn);
    expect(container.querySelector("[data-testid='chat-empty-state']")).toBeTruthy();
  });
});
