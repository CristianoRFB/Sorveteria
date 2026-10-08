import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(viteConfig, defineConfig({
  test: {
    include: ["tests/rules/**/*.rules.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "tests/integration/**"],
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
}));
