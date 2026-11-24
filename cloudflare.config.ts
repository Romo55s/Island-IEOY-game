import { bindings, defineConfig, exports } from "cf/config";
import * as entrypoint from "./worker/index.ts" with { type: "cf-worker" };

export default defineConfig({
  worker: {
    name: "ieoy-game",
    compatibilityDate: "2026-10-15",
    entrypoint,
    observability: {
      enabled: true,
      redactQueryString: true,
      logs: {
        enabled: true,
        invocationLogs: true,
        headSamplingRate: 1,
        persist: true,
      },
      issues: {
        enabled: true,
      },
    },
    assets: {
      notFoundHandling: "single-page-application",
      runWorkerFirst: ["/api/*", "/parties/*"],
    },
    exports: {
      GameRoom: exports.durableObject({ storage: "sqlite" }),
    },
    env: {
      GAME_ROOM: bindings.durableObject({
        worker: "ieoy-game",
        exportName: "GameRoom",
      }),
    },
  },
});
