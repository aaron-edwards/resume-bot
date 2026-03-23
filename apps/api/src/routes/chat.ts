import type { ChatMessage } from "@repo/types";
import type { LLMClient } from "../lib/llm/types.js";
import type { SessionStore } from "../lib/sessions/types.js";

interface Log {
  info(obj: object, msg: string): void;
  error(obj: unknown, msg?: string): void;
}

export async function handleChat(
  message: string,
  sessionId: string,
  write: (data: string) => void,
  sessions: SessionStore,
  llm: LLMClient,
  log: Log
) {
  const session = { sessionId, ...(await sessions.getSession(sessionId)) };

  log.info({ sessionId, message }, "chat request");

  const isFirstMessage = !session.messages.some((m) => m.role === "user");
  session.messages = [...session.messages, { role: "user" as const, content: message }];

  if (isFirstMessage) {
    const name = await llm.extractName(session.messages);
    session.userName = name;
    await sessions
      .saveSession(sessionId, session.messages, name)
      .catch((err) => log.error({ err }, "Failed to save userName"));
  }

  let assistantResponse = "";

  try {
    for await (const text of llm.streamChat(session.messages, session.userName)) {
      assistantResponse += text;
      write(`data: ${JSON.stringify({ text })}\n\n`);
    }

    log.info({ sessionId, response: assistantResponse }, "chat response");
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
