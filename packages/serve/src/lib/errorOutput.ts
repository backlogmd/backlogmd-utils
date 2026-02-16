import type { BacklogOutput } from "@backlogmd/types";

/**
 * Build an empty BacklogOutput with a single error entry.
 * Used as a fallback when the parser fails catastrophically.
 */
export function errorOutput(backlogDir: string, err: Error): BacklogOutput {
  return {
    protocol: "backlogmd/v2",
    generatedAt: new Date().toISOString(),
    rootDir: backlogDir,
    entries: [],
    items: [],
    tasks: [],
    validation: {
      errors: [
        {
          code: "FATAL_PARSE_ERROR",
          message: `Failed to read backlog: ${err.message}`,
          source: "",
        },
      ],
      warnings: [],
    },
  };
}
