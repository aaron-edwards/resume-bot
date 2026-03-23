import type { ChatMessage } from "@repo/types";
import type { SessionStore } from "../plugins/sessions/index.js";
import { COOKIE_MAX_AGE, SESSION_COOKIE } from "./consts.js";

export interface SessionRequest {
  cookies: Record<string, string | undefined>;
}

export interface SessionReply {
  setCookie(name: string, value: string, options?: object): void;
  send(data: { messages: ChatMessage[] }): void;
}

function cookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? ("none" as const) : ("lax" as const),
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  };
}

const GREETING: ChatMessage[] = [
  "Hi! I'm Aaron's ResumeBot.",
  "Before we begin, what is your name (or alter-ego)?",
].map((content) => ({ role: "assistant", content }));

async function getOrCreateSession(
  sessionId: string | undefined,
  reply: SessionReply,
  store: SessionStore
): Promise<{ sessionId: string; messages: ChatMessage[]; userName?: string }> {
  if (sessionId) {
    const { messages, userName } = await store.getSession(sessionId);
    if (messages.length > 0) return { sessionId, messages, userName };
  }

  const newId = crypto.randomUUID();
  await store.saveSession(newId, GREETING);
  reply.setCookie(SESSION_COOKIE, newId, cookieOptions());
  return { sessionId: newId, messages: GREETING };
}

export async function getSession(
  request: SessionRequest,
  reply: SessionReply,
  store: SessionStore
) {
  const sessionId = request.cookies[SESSION_COOKIE];
  const { messages } = await getOrCreateSession(sessionId, reply, store);
  return reply.send({ messages });
}

export async function resetSession(reply: SessionReply, store: SessionStore) {
  const newId = crypto.randomUUID();
  await store.saveSession(newId, GREETING);
  reply.setCookie(SESSION_COOKIE, newId, cookieOptions());
  return reply.send({ messages: GREETING });
}
