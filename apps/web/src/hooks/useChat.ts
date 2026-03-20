import type { ChatMessage } from "@repo/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getSessionMessages, resetSessionRequest, streamChatResponse } from "../lib/api";

export type { ChatMessage };

export type UseChatResponse = {
  messages: ChatMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  sendMessage: (message: string) => Promise<void>;
  resetSession: () => Promise<void>;
};

const SESSION_QUERY_KEY = ["session"];

export function useChat(): UseChatResponse {
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: getSessionMessages,
    staleTime: Number.POSITIVE_INFINITY,
  });

  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setMessages = (updater: (prev: ChatMessage[]) => ChatMessage[]) => {
    queryClient.setQueryData<ChatMessage[]>(SESSION_QUERY_KEY, (prev = []) => updater(prev));
  };

  const sendMessage = async (message: string) => {
    if (!message.trim() || isStreaming || isLoading) return;

    setMessages((prev) => [
      ...prev,
      { role: "user", content: message },
      { role: "assistant", content: "" },
    ]);
    setIsStreaming(true);
    setError(null);

    try {
      for await (const text of streamChatResponse(message)) {
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

  const resetSession = async () => {
    const newMessages = await resetSessionRequest();
    setMessages(() => newMessages);
    setError(null);
  };

  return { messages, isLoading, isStreaming, error, sendMessage, resetSession };
}
