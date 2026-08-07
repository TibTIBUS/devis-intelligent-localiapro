import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(() => {
  Object.assign(process.env, loadEnv("test", process.cwd(), ""));
  return {
    resolve: { tsconfigPaths: true },
    test: {
      environment: "node",
      include: ["tests/evals/**/*.eval.test.ts"],
      maxWorkers: 1,
      testTimeout: 60_000,
    },
  };
});
