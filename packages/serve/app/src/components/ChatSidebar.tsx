import React, { useState, useRef, useEffect } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const CHAT_API = "/api/chat";

export interface ChatSidebarProps {
  onCollapse?: () => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ onCollapse }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch(CHAT_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const errMsg = data?.message ?? data?.error ?? `Request failed (${res.status})`;
        setError(errMsg);
        return;
      }
      const content =
        typeof data?.message?.content === "string"
          ? data.message.content
          : String(data?.message?.content ?? "");
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content,
        },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Send failed";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <aside
      className="flex flex-col h-full w-80 shrink-0 border-r border-slate-200 bg-white"
      data-testid="chat-sidebar"
    >
      <div className="shrink-0 px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-800">Chat</h2>
        {onCollapse && (
          <button
            type="button"
            onClick={onCollapse}
            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
            aria-label="Collapse chat"
          >
            <span aria-hidden>▸</span>
          </button>
        )}
      </div>

      <div
        className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-0"
        data-testid="chat-message-list"
      >
        {messages.length === 0 && (
          <p
            className="text-slate-400 text-sm"
            data-testid="chat-empty-state"
          >
            No messages yet. Send a message below.
          </p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            data-testid={`chat-message-${msg.role}`}
            data-message-id={msg.id}
            className={
              msg.role === "user"
                ? "self-end max-w-[85%] rounded-lg bg-blue-500 text-white px-3 py-2 text-sm"
                : "self-start max-w-[85%] rounded-lg bg-slate-100 text-slate-800 px-3 py-2 text-sm"
            }
          >
            {msg.content}
          </div>
        ))}
        {isLoading && (
          <p
            className="self-start text-slate-400 text-sm italic"
            data-testid="chat-loading"
          >
            Thinking...
          </p>
        )}
        {error && (
          <p
            className="self-start text-red-600 text-sm"
            data-testid="chat-error"
          >
            {error}
          </p>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="shrink-0 p-4 border-t border-slate-200 flex flex-col gap-2">
        <textarea
          data-testid="chat-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={2}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none"
          aria-label="Message"
        />
        <button
          type="button"
          data-testid="chat-send-button"
          onClick={handleSend}
          disabled={!inputValue.trim() || isLoading}
          className="w-full rounded-lg bg-blue-500 text-white py-2 text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
        >
          {isLoading ? "Sending..." : "Send message"}
        </button>
      </div>
    </aside>
  );
};
