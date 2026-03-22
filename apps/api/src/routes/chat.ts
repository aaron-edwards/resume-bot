import rateLimit from "@fastify/rate-limit";
import type { ChatMessage, ChatRequest } from "@repo/types";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { sessionStore } from "../lib/sessions/index.js";
import { SESSION_COOKIE, getIp } from "./shared.js";

function startSseStream(reply: FastifyReply) {
  reply.raw.setHeader("Content-Type", "text/event-stream");
  reply.raw.setHeader("Cache-Control", "no-cache");
  reply.raw.setHeader("Connection", "keep-alive");
  reply.raw.setHeader(
    "Access-Control-Allow-Origin",
    process.env.CORS_ORIGIN ?? "http://localhost:5173"
  );
  reply.raw.setHeader("Access-Control-Allow-Credentials", "true");
  reply.raw.flushHeaders();
}

async function streamAndSave(
  { llm, log }: FastifyInstance,
  session: { sessionId: string; ip: string; messages: ChatMessage[]; userName?: string },
  reply: FastifyReply
) {
  let assistantResponse = "";

  try {
    for await (const text of llm.streamChat(session.messages, session.userName)) {
      assistantResponse += text;
      reply.raw.write(`data: ${JSON.stringify({ text })}\n\n`);
    }

    log.info({ sessionId: session.sessionId, response: assistantResponse }, "chat response");
    reply.raw.write("data: [DONE]\n\n");

    await sessionStore
      .saveSession(
        session.sessionId,
        session.ip,
        [...session.messages, { role: "assistant", content: assistantResponse }],
        session.userName
      )
      .catch((err) => log.error({ err }, "Failed to save session"));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error(err);
    reply.raw.write(`data: ${JSON.stringify({ error: message })}\n\n`);
  } finally {
    reply.raw.end();
  }
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
    async (request: FastifyRequest<{ Body: ChatRequest }>, reply) => {
      const { message } = request.body;
      const sessionId = request.cookies[SESSION_COOKIE];
      if (!sessionId) return reply.status(400).send({ error: "No session" });

      const session = {
        sessionId,
        ip: getIp(request),
        ...(await sessionStore.getSession(sessionId)),
      };

      startSseStream(reply);
      app.log.info({ sessionId: session.sessionId, ip: session.ip, message }, "chat request");

      const isFirstMessage = !session.messages.some((m) => m.role === "user");
      session.messages = [...session.messages, { role: "user" as const, content: message }];

      if (isFirstMessage) {
        const name = await app.llm.extractName(session.messages);
        session.userName = name;
        await sessionStore
          .saveSession(session.sessionId, session.ip, session.messages, name)
          .catch((err) => app.log.error({ err }, "Failed to save userName"));
      }

      await streamAndSave(app, session, reply);
    }
  );
}
