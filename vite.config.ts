import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/node_modules/@firebase/firestore")) return "firebase-firestore";
          if (id.includes("/node_modules/@firebase/auth")) return "firebase-auth";
          if (id.includes("/node_modules/@firebase/functions")) return "firebase-functions";
          if (id.includes("/node_modules/@firebase/storage")) return "firebase-storage";
          if (id.includes("/node_modules/@firebase/")) return "firebase-core";
          if (/\/node_modules\/(react|react-dom|scheduler)\//.test(id)) return "react-vendor";
        },
      },
    },
  },
});
