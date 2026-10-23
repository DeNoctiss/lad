import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: process.env.VITE_BASE ?? "/",
  plugins: [react()],
  // The audio worker is discovered on first import. Prebundle its dependency
  // to prevent a late dev-page reload from cancelling the first audio upload.
  optimizeDeps: {
    include: [
      "soundtouchjs",
      "@spotify/basic-pitch",
      "@tensorflow/tfjs",
      "@tensorflow/tfjs-backend-wasm",
    ],
  },
  server: { port: 5174, strictPort: true },
});
