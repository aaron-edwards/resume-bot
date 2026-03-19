import type { FastifyInstance } from "fastify";
import { streamChat } from "../lib/gemini.js";

type ChatBody = { message: string };

export async function chatRoutes(app: FastifyInstance) {
  app.post<{ Body: ChatBody }>(
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
    async (request, reply) => {
      const { message } = request.body;

      reply.raw.setHeader("Content-Type", "text/event-stream");
      reply.raw.setHeader("Cache-Control", "no-cache");
      reply.raw.setHeader("Connection", "keep-alive");
      reply.raw.flushHeaders();

      try {
        const stream = await streamChat(message);

        for await (const chunk of stream) {
          const text = chunk.text;
          if (text) {
            reply.raw.write(`data: ${JSON.stringify({ text })}\n\n`);
          }
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
