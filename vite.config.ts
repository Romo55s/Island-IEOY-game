import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const lanMode = process.env.IEOY_LAN_DEV === "1";

export default defineConfig({
  plugins: [react(), cloudflare({ persistState: { path: ".cloudflare/state" } })],
  server: {
    host: lanMode ? "0.0.0.0" : "127.0.0.1",
    port: 5174,
    strictPort: true,
  },
});
