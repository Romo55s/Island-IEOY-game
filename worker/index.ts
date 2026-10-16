import { routePartykitRequest } from "partyserver";

import { GameRoom } from "./game/GameRoom";
import { handleCreateSession } from "./http/createSession";
import { handleIssueTicket } from "./http/issueTicket";
import { apiError, jsonResponse } from "./http/responses";

export { GameRoom };

const worker: ExportedHandler<Env> = {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/api/health") {
      return jsonResponse({ ok: true });
    }

    if (request.method === "POST" && url.pathname === "/api/sessions") return handleCreateSession(request, env);

    const ticketRoute = url.pathname.match(/^\/api\/sessions\/([A-HJ-NP-Z2-9]{6})\/tickets$/u);
    if (request.method === "POST" && ticketRoute) return handleIssueTicket(request, env, ticketRoute[1]!);

    if (url.pathname.startsWith("/parties/game-room/")) {
      if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
        return new Response("WebSocket upgrade required", { status: 426, headers: { Upgrade: "websocket" } });
      }
      const routed = await routePartykitRequest(request, env, {
        onBeforeConnect(incoming) {
          const incomingUrl = new URL(incoming.url);
          const ticket = incomingUrl.searchParams.get("ticket");
          if (!ticket) return apiError(401, "TICKET_INVALID", "A connection ticket is required.");
          incomingUrl.searchParams.delete("ticket");
          const sanitized = new Request(incomingUrl, incoming);
          sanitized.headers.set("x-ieoy-ticket", ticket);
          return sanitized;
        },
      });
      return routed ?? apiError(404, "ROOM_NOT_FOUND", "That session does not exist.");
    }

    if (url.pathname.startsWith("/api/")) {
      return apiError(404, "ROOM_NOT_FOUND", "API route not found.");
    }

    return new Response("Not found", { status: 404 });
  },
};

export default worker;
