import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ChatMessage } from "@repo/types";
import { getSessionMessages, streamChatResponse } from "../lib/api";

export type { ChatMessage };

export type UseChatResponse = {
  messages: ChatMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  sendMessage: (message: string) => Promise<void>;
  resetSession: () => void;
};

const SESSION_KEY = "resumebot-session-id";

function getSessionId(): string {
  const existing = localStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(SESSION_KEY, id);
  return id;
}

function createSessionId(): string {
  const id = crypto.randomUUID();
  localStorage.setItem(SESSION_KEY, id);
  return id;
}

export function useChat(): UseChatResponse {
  const queryClient = useQueryClient();
  const [sessionId, setSessionId] = useState(() => getSessionId());

  const { data: history, isLoading } = useQuery({
    queryKey: ["session", sessionId],
    queryFn: () => getSessionMessages(sessionId),
    staleTime: Number.POSITIVE_INFINITY,
  });

  const initialMessages = history ?? [];
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayMessages = messages.length > 0 ? messages : initialMessages;

  const sendMessage = async (message: string) => {
    if (!message.trim() || isStreaming || isLoading) return;

    const next: ChatMessage[] = [
      ...displayMessages,
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

  const resetSession = () => {
    const newId = createSessionId();
    setMessages([]);
    setError(null);
    queryClient.removeQueries({ queryKey: ["session", sessionId] });
    setSessionId(newId);
  };

  return { messages: displayMessages, isLoading, isStreaming, error, sendMessage, resetSession };
}
