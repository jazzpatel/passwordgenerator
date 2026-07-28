import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  publicDir: "public",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    // Ensure sw.js is not processed/hashed by Vite
    rollupOptions: {
      input: { main: "./index.html" },
    },
  },
  server: {
    port: 5173,
    // Serve sw.js with the header that allows it to control the full origin
    headers: {
      "Service-Worker-Allowed": "/",
    },
  },
  plugins: [],
});
