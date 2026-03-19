import type { FastifyInstance } from "fastify";
import type { ChatRequest } from "@repo/types";
import { streamChat } from "../lib/gemini.js";

export async function chatRoutes(app: FastifyInstance) {
  app.post<{ Body: ChatRequest }>(
    "/chat",
    {
      schema: {
        body: {
          type: "object",
          required: ["messages"],
          properties: {
            messages: {
              type: "array",
              minItems: 1,
              items: {
                type: "object",
                required: ["role", "content"],
                properties: {
                  role: { type: "string", enum: ["user", "assistant"] },
                  content: { type: "string", minLength: 1 },
                },
                if: { properties: { role: { const: "user" } } },
                // biome-ignore lint/suspicious/noThenProperty: `then` is part of the fastify schema validation
                then: { properties: { content: { type: "string", maxLength: 1000 } } },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { messages } = request.body;

      reply.raw.setHeader("Content-Type", "text/event-stream");
      reply.raw.setHeader("Cache-Control", "no-cache");
      reply.raw.setHeader("Connection", "keep-alive");
      reply.raw.setHeader(
        "Access-Control-Allow-Origin",
        process.env.CORS_ORIGIN ?? "http://localhost:5173"
      );
      reply.raw.flushHeaders();

      try {
        for await (const text of streamChat(messages)) {
          reply.raw.write(`data: ${JSON.stringify({ text })}\n\n`);
        }

        reply.raw.write("data: [DONE]\n\n");
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
