import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(viteConfig, defineConfig({
  test: {
    include: ["tests/**/*.test.ts", "tests/**/*.test.js"],
    exclude: ["**/node_modules/**", "**/dist/**", "tests/rules/**", "tests/integration/**"],
  },
}));
