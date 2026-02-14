import { useState, useEffect, useRef } from "react";
import { useBacklog } from "./hooks/useBacklog";
import { Board } from "./components/Board";
import { NotificationBanner } from "./components/NotificationBanner";
import { Sidebar } from "./components/Sidebar";

export function App() {
  const { data, connected, errors, warnings } = useBacklog();
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [boardKey, setBoardKey] = useState(0);
  const lastTimestampRef = useRef<string | null>(null);

  useEffect(() => {
    if (data?.generatedAt) {
      const timestamp = data.generatedAt as string;
      if (lastTimestampRef.current && lastTimestampRef.current !== timestamp) {
        setBoardKey((k) => k + 1);
      }
      lastTimestampRef.current = timestamp;
    }
  }, [data?.generatedAt]);

  return (
    <div className="bg-slate-50 min-h-screen">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center gap-4">
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
            <button
              onClick={() => setSidebarOpen(true)}
              className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              🤖 Autopilot
            </button>
            <span
              className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-500" : "bg-red-400"}`}
            />
            <span className="text-xs font-medium text-slate-500">
              {connected ? "Live" : "Disconnected"}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {data ? (
          <Board key={boardKey} data={data as any} searchQuery={searchQuery} />
        ) : (
          <p className="text-slate-400 text-sm">Loading...</p>
        )}
        <NotificationBanner errors={errors} warnings={warnings} />
      </main>

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </div>
  );
}
