import rateLimit from "@fastify/rate-limit";
import type { ChatRequest } from "@repo/types";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { serverSideEventStreamWriter } from "../lib/sse.js";
import { handleChat } from "./chat.js";
import { SESSION_COOKIE } from "./consts.js";
import { getSession, resetSession } from "./session.js";

export async function sessionRoutes(app: FastifyInstance) {
  app.get("/session", (request, reply) => getSession(request, reply, app.sessions));
  app.post("/session/reset", (_, reply) => resetSession(reply, app.sessions));
}

export async function chatRoutes(app: FastifyInstance) {
  await app.register(rateLimit, { max: 5, timeWindow: "1 minute" });

  app.post<{ Body: ChatRequest }>(
    "/chat",
    {
      schema: {
        body: {
          type: "object",
          required: ["message"],
          properties: {
            message: { type: "string", minLength: 1, maxLength: 1000 },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: ChatRequest }>, reply: FastifyReply) => {
      const sessionId = request.cookies[SESSION_COOKIE];
      if (!sessionId) return reply.status(400).send({ error: "No session" });

      return serverSideEventStreamWriter(reply, (write) =>
        handleChat(request.body.message, sessionId, write, app.sessions, app.llm, app.log)
      );
    }
  );
}
