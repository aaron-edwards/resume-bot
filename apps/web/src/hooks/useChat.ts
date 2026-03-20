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

export function useChat(): UseChatResponse {
  const queryClient = useQueryClient();

  const { data: history, isLoading } = useQuery({
    queryKey: ["session"],
    queryFn: getSessionMessages,
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
    const messages = await resetSessionRequest();
    queryClient.setQueryData(["session"], messages);
    setMessages([]);
    setError(null);
  };

  return { messages: displayMessages, isLoading, isStreaming, error, sendMessage, resetSession };
}
