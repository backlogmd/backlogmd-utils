import { useBacklog } from "./hooks/useBacklog";
import { Board } from "./components/Board";
import { NotificationBanner } from "./components/NotificationBanner";

export function App() {
  const { data, connected, errors, warnings } = useBacklog();

  return (
    <div className="bg-slate-50 min-h-screen">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold tracking-tight text-slate-800">
            backlog.md board
          </h1>
          <div className="flex items-center gap-2">
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
        <NotificationBanner errors={errors} warnings={warnings} />
        {data ? (
          <Board data={data as any} />
        ) : (
          <p className="text-slate-400 text-sm">Loading...</p>
        )}
      </main>
    </div>
  );
}
