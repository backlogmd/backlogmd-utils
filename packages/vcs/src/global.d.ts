/** Minimal fetch/Response types for Node 18+ (no DOM lib). */
declare function fetch(
  input: string | URL,
  init?: { method?: string; headers?: Record<string, string>; body?: string }
): Promise<{
  ok: boolean;
  status: number;
  statusText: string;
  json(): Promise<unknown>;
}>;
