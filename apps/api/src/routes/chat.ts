import type { ChatRequestBody } from "@repo/types";
import type { FastifyRequest } from "fastify";
import sanitizeHtml from "sanitize-html";
import type { LLMClient } from "../lib/llm/types.js";
import type { SessionStore } from "../lib/sessions/types.js";
import { sanitiseSessionId } from "../lib/utils.js";

type ChatRequest = Pick<FastifyRequest<{ Body: ChatRequestBody }>, "body" | "ip">;
interface Log {
  info(obj: object, msg: string): void;
  error(obj: unknown, msg?: string): void;
}

export async function handleChat(
  request: ChatRequest,
  sessionId: string,
  write: (data: string) => void,
  sessions: SessionStore,
  llm: LLMClient,
  log: Log
) {
  const session = { sessionId, ...(await sessions.getSession(sessionId)) };
  const ip = request.ip;
  const message = request.body.message;

  log.info({ sessionId: sanitiseSessionId(sessionId), ip }, "chat request received");

  const sanitizedMessage = sanitizeHtml(message, { allowedTags: [], allowedAttributes: {} });
  const isFirstMessage = !session.messages.some((m) => m.role === "user");
  session.messages = [...session.messages, { role: "user" as const, content: sanitizedMessage }];

  if (isFirstMessage) {
    const name = await llm.extractName(session.messages);
    session.userName = name;
    log.info(
      { sessionId: sanitiseSessionId(sessionId), found: !!name },
      "name extraction complete"
    );
    await sessions
      .saveSession(sessionId, session.messages, name, ip)
      .catch((err) => log.error({ err }, "Failed to save userName"));
  }

  let assistantResponse = "";

  try {
    for await (const text of llm.streamChat(session.messages, session.userName)) {
      assistantResponse += text;
      write(`data: ${JSON.stringify({ text })}\n\n`);
    }

    log.info({ sessionId: sanitiseSessionId(sessionId) }, "chat response sent");
    write("data: [DONE]\n\n");

    await sessions
      .saveSession(
        sessionId,
        [...session.messages, { role: "assistant", content: assistantResponse }],
        session.userName
      )
      .catch((err) => log.error({ err }, "Failed to save session"));
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : String(err);
    log.error(err);
    write(`data: ${JSON.stringify({ error: errMessage })}\n\n`);
  }
}
