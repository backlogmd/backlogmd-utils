import { useState, useEffect, useRef } from "react";
import type { BacklogStateDto } from "@backlogmd/types";

export type { BacklogStateDto };

declare global {
  interface Window {
    __BACKLOG__?: BacklogStateDto;
    __CHAT_ENABLED__?: boolean;
  }
}

export function useBacklog() {
  const [data, setData] = useState<BacklogStateDto | null>(() => window.__BACKLOG__ ?? null);
  const [connected, setConnected] = useState(false);
  const [workerCount, setWorkerCount] = useState(0);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource("/events");
    esRef.current = es;

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    es.onmessage = (event) => {
      if (event.data === "reload") {
        fetch("/api/backlog")
          .then((res) => res.json())
          .then((json) => setData(json));
        return;
      }
      try {
        const payload = JSON.parse(event.data) as { type?: string; workers?: number };
        if (payload?.type === "status" && typeof payload.workers === "number") {
          setWorkerCount(payload.workers);
        }
      } catch {
        // ignore non-JSON messages
      }
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, []);

  const errors = data?.validation?.errors ?? [];
  const warnings = data?.validation?.warnings ?? [];

  return { data, connected, errors, warnings, workerCount } as const;
}
