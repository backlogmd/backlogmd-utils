import { useState, useEffect, useRef } from "react";

export interface ValidationIssue {
  code: string;
  message: string;
  source: string;
}

interface BacklogData {
  entries: unknown[];
  items: unknown[];
  tasks: unknown[];
  validation?: {
    errors: ValidationIssue[];
    warnings: ValidationIssue[];
  };
  [key: string]: unknown;
}

declare global {
  interface Window {
    __BACKLOG__?: BacklogData;
  }
}

export function useBacklog() {
  const [data, setData] = useState<BacklogData | null>(() => window.__BACKLOG__ ?? null);
  const [connected, setConnected] = useState(false);
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
      }
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, []);

  const errors = data?.validation?.errors ?? [];
  const warnings = data?.validation?.warnings ?? [];

  return { data, connected, errors, warnings };
}
