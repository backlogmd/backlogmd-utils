import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "server",
          include: ["tests/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        test: {
          name: "ui",
          include: ["app/src/**/*.test.{ts,tsx}"],
          environment: "happy-dom",
        },
      },
    ],
  },
});
