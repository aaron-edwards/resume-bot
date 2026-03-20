import type { FastifyInstance } from "fastify";
import type { ChatMessage, ChatRequest } from "@repo/types";
import { streamChat } from "../lib/gemini.js";
import { sessionStore } from "../lib/sessions/index.js";

const GREETING: ChatMessage = {
  role: "assistant",
  content: "Hi! I'm Aaron's ResumeBot. What would you like to know about Aaron?",
};

const SESSION_COOKIE = "session-id";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function cookieOptions(request: { hostname: string }) {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? ("none" as const) : ("lax" as const),
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  };
}

function getIp(request: { headers: Record<string, string | string[] | undefined>; ip: string }): string {
  return (request.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
    ?? request.ip
    ?? "unknown";
}

async function getOrCreateSession(
  sessionId: string | undefined,
  ip: string,
  reply: { setCookie: (name: string, value: string, opts: object) => void },
  request: { hostname: string }
): Promise<{ sessionId: string; messages: ChatMessage[] }> {
  if (sessionId) {
    const messages = await sessionStore.getSession(sessionId);
    if (messages.length > 0) return { sessionId, messages };
  }

  const newId = crypto.randomUUID();
  const messages = [GREETING];
  await sessionStore.saveSession(newId, ip, messages);
  reply.setCookie(SESSION_COOKIE, newId, cookieOptions(request));
  return { sessionId: newId, messages };
}

export async function chatRoutes(app: FastifyInstance) {
  app.get("/session", async (request, reply) => {
    const ip = getIp(request);
    const sessionId = request.cookies[SESSION_COOKIE];
    const { messages } = await getOrCreateSession(sessionId, ip, reply, request);
    return reply.send({ messages });
  });

  app.post("/session/reset", async (request, reply) => {
    const ip = getIp(request);
    const newId = crypto.randomUUID();
    const messages = [GREETING];
    await sessionStore.saveSession(newId, ip, messages);
    reply.setCookie(SESSION_COOKIE, newId, cookieOptions(request));
    return reply.send({ messages });
  });

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
    async (request, reply) => {
      const { message } = request.body;
      const sessionId = request.cookies[SESSION_COOKIE];
      const ip = getIp(request);

      reply.raw.setHeader("Content-Type", "text/event-stream");
      reply.raw.setHeader("Cache-Control", "no-cache");
      reply.raw.setHeader("Connection", "keep-alive");
      reply.raw.setHeader(
        "Access-Control-Allow-Origin",
        process.env.CORS_ORIGIN ?? "http://localhost:5173"
      );
      reply.raw.setHeader("Access-Control-Allow-Credentials", "true");
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
