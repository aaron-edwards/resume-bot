import type { FastifyInstance } from "fastify";
import { getSession, resetSession } from "./session.js";

export async function sessionRoutes(app: FastifyInstance) {
  app.get("/session", getSession);
  app.post("/session/reset", resetSession);
}
