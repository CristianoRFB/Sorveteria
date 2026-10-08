import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(viteConfig, defineConfig({
  test: {
    include: ["tests/integration/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "tests/rules/**"],
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
}));
