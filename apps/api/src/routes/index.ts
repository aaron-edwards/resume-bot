import rateLimit from "@fastify/rate-limit";
import type { ChatRequestBody } from "@repo/types";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { serverSideEventStreamWriter } from "../lib/utils";
import { handleChat } from "./chat";
import { SESSION_COOKIE } from "./consts";
import { getSession, resetSession } from "./session";

export async function sessionRoutes(app: FastifyInstance) {
  app.get("/session", (request, reply) => getSession(request, reply, app.sessions, app.log));
  app.post("/session/reset", (_, reply) => resetSession(reply, app.sessions, app.log));
}

export async function chatRoutes(app: FastifyInstance, opts: { corsOrigin: string }) {
  await app.register(rateLimit, { max: 5, timeWindow: "1 minute" });

  app.post<{ Body: ChatRequestBody }>(
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
    async (request: FastifyRequest<{ Body: ChatRequestBody }>, reply: FastifyReply) => {
      const sessionId = request.cookies[SESSION_COOKIE];
      if (!sessionId) return reply.status(400).send({ error: "No session" });

      return serverSideEventStreamWriter(reply, opts.corsOrigin, (write) =>
        handleChat(request, sessionId, write, app.sessions, app.llm, app.log)
      );
    }
  );
}
