import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  plugins: [react(), nodePolyfills()],
  server: {
    port: 3000,
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
  optimizeDeps: {
    exclude: ["@noir-lang/noir_js", "@aztec/bb.js"],
  },
});
