import type { ChatMessage } from "@repo/types";
import type { FastifyInstance } from "fastify";
import { sessionStore } from "../lib/sessions/index.js";
import { SESSION_COOKIE, cookieOptions, getIp } from "./shared.js";

const GREETING: ChatMessage[] = [
  "Hi! I'm Aaron's ResumeBot.",
  "Before we begin, what is your name (or alter-ego)?",
].map((content) => ({ role: "assistant", content }));

async function getOrCreateSession(
  sessionId: string | undefined,
  ip: string,
  reply: { setCookie: (name: string, value: string, opts: object) => void }
): Promise<{ sessionId: string; messages: ChatMessage[]; userName?: string }> {
  if (sessionId) {
    const { messages, userName } = await sessionStore.getSession(sessionId);
    if (messages.length > 0) return { sessionId, messages, userName };
  }

  const newId = crypto.randomUUID();
  await sessionStore.saveSession(newId, ip, GREETING);
  reply.setCookie(SESSION_COOKIE, newId, cookieOptions());
  return { sessionId: newId, messages: GREETING };
}

export async function sessionRoutes(app: FastifyInstance) {
  app.get("/session", async (request, reply) => {
    const ip = getIp(request);
    const sessionId = request.cookies[SESSION_COOKIE];
    const { messages } = await getOrCreateSession(sessionId, ip, reply);
    return reply.send({ messages });
  });

  app.post("/session/reset", async (request, reply) => {
    const ip = getIp(request);
    const newId = crypto.randomUUID();
    await sessionStore.saveSession(newId, ip, GREETING);
    reply.setCookie(SESSION_COOKIE, newId, cookieOptions());
    return reply.send({ messages: GREETING });
  });
}
