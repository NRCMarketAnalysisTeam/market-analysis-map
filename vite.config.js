import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The app is fully static: no server. "./" makes all links relative, so the
// same build works at marketanalysismap.com and at a GitHub Pages address
// such as <account>.github.io/market-analysis-map/.
export default defineConfig({
  base: "./",
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5000,
  },
});
