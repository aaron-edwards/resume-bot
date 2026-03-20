import type { FastifyInstance } from "fastify";
import type { ChatMessage, ChatRequest } from "@repo/types";
import { streamChat } from "../lib/gemini.js";
import { sessionStore } from "../lib/sessions/index.js";

export async function chatRoutes(app: FastifyInstance) {
  app.get<{ Params: { sessionId: string } }>(
    "/session/:sessionId",
    {
      schema: {
        params: {
          type: "object",
          required: ["sessionId"],
          properties: { sessionId: { type: "string" } },
        },
      },
    },
    async (request, reply) => {
      const { sessionId } = request.params;
      const ip = (request.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
        ?? request.ip
        ?? "unknown";

      let messages: ChatMessage[] = await sessionStore.getSession(sessionId);

      if (messages.length === 0) {
        messages = [{ role: "assistant", content: "Hi! I'm Aaron's ResumeBot. What would you like to know about Aaron?" }];
        await sessionStore.saveSession(sessionId, ip, messages);
      }

      return reply.send({ messages });
    }
  );

  app.post<{ Body: ChatRequest }>(
    "/chat",
    {
      schema: {
        body: {
          type: "object",
          required: ["message"],
          properties: {
            message: { type: "string", minLength: 1, maxLength: 1000 },
            sessionId: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const { message, sessionId } = request.body;
      const ip = (request.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
        ?? request.ip
        ?? "unknown";

      reply.raw.setHeader("Content-Type", "text/event-stream");
      reply.raw.setHeader("Cache-Control", "no-cache");
      reply.raw.setHeader("Connection", "keep-alive");
      reply.raw.setHeader(
        "Access-Control-Allow-Origin",
        process.env.CORS_ORIGIN ?? "http://localhost:5173"
      );
      reply.raw.flushHeaders();

      app.log.info({ sessionId, ip, message }, "chat request");

      const history = sessionId ? await sessionStore.getSession(sessionId) : [];
      const messages = [...history.slice(-10), { role: "user" as const, content: message }];

      let assistantResponse = "";

      try {
        for await (const text of streamChat(messages)) {
          assistantResponse += text;
          reply.raw.write(`data: ${JSON.stringify({ text })}\n\n`);
        }

        app.log.info({ sessionId, response: assistantResponse }, "chat response");

        reply.raw.write("data: [DONE]\n\n");

        if (sessionId) {
          await sessionStore.saveSession(sessionId, ip, [
            ...messages,
            { role: "assistant", content: assistantResponse },
          ]).catch((err) => app.log.error({ err }, "Failed to save session"));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        app.log.error(err);
        reply.raw.write(`data: ${JSON.stringify({ error: message })}\n\n`);
      } finally {
        reply.raw.end();
      }
    }
  );
}
