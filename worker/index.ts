import { DurableObject } from "cloudflare:workers";

export class GameRoom extends DurableObject<Env> {
  fetch(): Response {
    return Response.json({ error: "Room routes are not available yet." }, { status: 501 });
  }
}

const worker: ExportedHandler<Env> = {
  fetch(request) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/api/health") {
      return Response.json({ ok: true });
    }

    if (url.pathname.startsWith("/api/")) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  },
};

export default worker;
