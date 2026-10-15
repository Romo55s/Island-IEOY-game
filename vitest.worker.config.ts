import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      main: "./worker/index.ts",
      miniflare: {
        durableObjects: { GAME_ROOM: "GameRoom" },
      },
    }),
  ],
  test: {
    include: ["tests/worker/**/*.test.ts"],
  },
});
