import { useState } from "react";
import type { ChatMessage } from "@repo/types";
import { streamChatResponse } from "../lib/api";

export type { ChatMessage };

export type UseChatResponse = {
  messages: ChatMessage[];
  isStreaming: boolean;
  sendMessage: (message: string) => Promise<void>;
};

export function useChat(): UseChatResponse {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const appendToLastMessage = (text: string) => {
    setMessages((prev) => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      if (last) updated[updated.length - 1] = { ...last, content: last.content + text };
      return updated;
    });
  };

  const sendMessage = async (message: string) => {
    if (!message.trim() || isStreaming) return;

    const next: ChatMessage[] = [
      ...messages,
      { role: "user", content: message },
      { role: "assistant", content: "" },
    ];

    setMessages(next);
    setIsStreaming(true);

    try {
      for await (const text of streamChatResponse(next.slice(0, -1))) {
        appendToLastMessage(text);
      }
    } finally {
      setIsStreaming(false);
    }
  };

  return { messages, isStreaming, sendMessage };
}
