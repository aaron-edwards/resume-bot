import type { FastifyInstance } from "fastify";
import type { SessionReply } from "./session.js";
import { getSession, resetSession } from "./session.js";

export async function sessionRoutes(app: FastifyInstance) {
  app.get("/session", (req, reply) =>
    getSession(req, reply as unknown as SessionReply, app.sessions)
  );
  app.post("/session/reset", (req, reply) =>
    resetSession(req, reply as unknown as SessionReply, app.sessions)
  );
}
