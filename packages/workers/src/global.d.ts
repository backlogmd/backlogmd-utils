/** URL global (Node 22; no DOM lib). */
declare var URL: {
  prototype: URL;
  new (input: string, base?: string): URL;
};

/** Minimal url module for ESM __dirname (no DOM). */
declare module "url" {
  export function fileURLToPath(url: string | URL): string;
}

/** Minimal fs/promises for workers (avoids @types/node resolution in workspace). */
declare module "fs/promises" {
  function readFile(
    path: string,
    options?: string | { encoding?: string }
  ): Promise<string>;
  const defaultExport: { readFile: typeof readFile };
  export default defaultExport;
}
