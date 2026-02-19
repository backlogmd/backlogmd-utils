import { useState, useRef } from "react";
import { useBacklog } from "./hooks/useBacklog";
import { Board } from "./components/Board";
import { NotificationBanner } from "./components/NotificationBanner";
import { ChatSidebar } from "./components/ChatSidebar";
import { WorkersPopover } from "./components/WorkersPopover";

export function App() {
  const { data, connected, errors, warnings, workerCount } = useBacklog();
  const [searchQuery, setSearchQuery] = useState("");
  const [workersPopoverOpen, setWorkersPopoverOpen] = useState(false);
  const [chatExpanded, setChatExpanded] = useState(false);
  const workersAnchorRef = useRef<HTMLDivElement>(null);

  return (
    <div className="bg-slate-50 h-screen flex flex-col overflow-hidden">
      <header className="bg-white border-b border-slate-200 z-10 shrink-0 w-full">
        <div className="w-full px-6 py-4 flex justify-between items-center gap-4">
          <h1 className="text-xl font-semibold tracking-tight text-slate-800 shrink-0">
            backlog.md board
          </h1>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items..."
            className="w-full max-w-xs rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
          />
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative" ref={workersAnchorRef}>
              <button
                type="button"
                onClick={() => setWorkersPopoverOpen((open) => !open)}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1"
                aria-expanded={workersPopoverOpen}
                aria-haspopup="true"
                aria-label={
                  workerCount > 0
                    ? `${workerCount} worker${workerCount !== 1 ? "s" : ""} connected. Click to view list.`
                    : "Workers. Click to view list."
                }
              >
                {workerCount > 0 ? (
                  <>
                    <span>{workerCount} worker{workerCount !== 1 ? "s" : ""}</span>
                    <span className="text-slate-400" aria-hidden>▾</span>
                  </>
                ) : (
                  <span>Workers</span>
                )}
              </button>
              <WorkersPopover
                isOpen={workersPopoverOpen}
                onClose={() => setWorkersPopoverOpen(false)}
                anchorRef={workersAnchorRef}
                workerCount={workerCount}
              />
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-500" : "bg-red-400"}`}
              />
              <span className="text-xs font-medium text-slate-500">
                {connected ? "Live" : "Disconnected"}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {typeof window !== "undefined" && window.__CHAT_ENABLED__ === true && (
          <>
            {chatExpanded ? (
              <div className="h-full shrink-0 flex min-w-0">
                <ChatSidebar onCollapse={() => setChatExpanded(false)} />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setChatExpanded(true)}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-8 h-16 flex items-center justify-center rounded-l-lg border border-r-0 border-slate-200 bg-white shadow-sm hover:bg-slate-50 text-slate-600 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-inset"
                aria-label="Open chat"
              >
                <span className="text-xs font-medium -rotate-90 whitespace-nowrap">Chat</span>
              </button>
            )}
          </>
        )}
        <main className="flex-1 min-w-0 max-w-7xl mx-auto px-6 py-8 overflow-auto">
          {data ? (
            <Board
              data={data}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
            />
          ) : (
            <p className="text-slate-400 text-sm">Loading...</p>
          )}
          <NotificationBanner errors={errors} warnings={warnings} />
        </main>
      </div>
    </div>
  );
}
