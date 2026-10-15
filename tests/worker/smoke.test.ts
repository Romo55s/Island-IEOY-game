import { env, exports } from "cloudflare:workers";
import { expect, it } from "vitest";

it("serves a health response without touching a room", async () => {
  expect(env.GAME_ROOM).toBeDefined();
  const response = await exports.default.fetch("https://local.test/api/health");

  expect(await response.json()).toEqual({ ok: true });
});
