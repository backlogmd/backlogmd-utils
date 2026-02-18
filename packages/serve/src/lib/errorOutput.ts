import type { BacklogStateDto } from "@backlogmd/types";

/**
 * Build a minimal BacklogStateDto with a single error entry.
 * Used as a fallback when the parser fails catastrophically.
 */
export function errorBacklogStateDto(backlogDir: string, err: Error): BacklogStateDto {
  return {
    protocol: "backlogmd/v2",
    generatedAt: new Date().toISOString(),
    rootDir: backlogDir,
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
    work: [],
  };
}
