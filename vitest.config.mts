import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Next.js aliases this marker package to a no-op for server bundles at
      // build time; Vitest has no such build step, so it needs the same
      // substitution to import server-only modules under test.
      "server-only": "next/dist/compiled/server-only/empty.js",
    },
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    include: ["tests/unit/**/*.test.{ts,tsx}"],
  },
});
