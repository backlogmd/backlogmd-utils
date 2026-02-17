/// <reference types="node" />

/** Minimal url module for ESM __dirname (no DOM). */
declare module "url" {
  export function fileURLToPath(url: string | URL): string;
}

declare function setTimeout(callback: () => void, ms?: number): number;
declare function clearTimeout(id: number): void;
