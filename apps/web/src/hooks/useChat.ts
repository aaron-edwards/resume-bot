import { useState } from "react";
import type { ChatMessage } from "@repo/types";
import { streamChatResponse } from "../lib/api";

export type { ChatMessage };

export type UseChatResponse = {
  messages: ChatMessage[];
  isStreaming: boolean;
  error: string | null;
  sendMessage: (message: string) => Promise<void>;
};

const INITIAL_MESSAGE: ChatMessage = {
  role: "assistant",
  content: "Hi! I'm Aaron's ResumeBot. What would you like to know about Aaron?",
};

function getSessionId(): string {
  const key = "resumebot-session-id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(key, id);
  return id;
}

export function useChat(): UseChatResponse {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async (message: string) => {
    if (!message.trim() || isStreaming) return;

    const sessionId = getSessionId();

    const next: ChatMessage[] = [
      ...messages,
      { role: "user", content: message },
      { role: "assistant", content: "" },
    ];

    setMessages(next);
    setIsStreaming(true);
    setError(null);

    try {
      for await (const text of streamChatResponse(message, sessionId)) {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last) updated[updated.length - 1] = { ...last, content: last.content + text };
          return updated;
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsStreaming(false);
    }
  };

  return { messages, isStreaming, error, sendMessage };
}
