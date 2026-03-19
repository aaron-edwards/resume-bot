import { useState } from "react";
import { streamChatResponse } from "../lib/api";

export type Message = {
  role: "user" | "assistant";
  content: string;
};

export type UseChatResponse = {
  messages: Message[];
  isStreaming: boolean;
  sendMessage: (message: string) => Promise<void>;
};

export function useChat(): UseChatResponse {
  const [messages, setMessages] = useState<Message[]>([]);
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

    setMessages((prev) => [
      ...prev,
      { role: "user", content: message },
      { role: "assistant", content: "" },
    ]);
    setIsStreaming(true);

    try {
      for await (const text of streamChatResponse(message)) {
        appendToLastMessage(text);
      }
    } finally {
      setIsStreaming(false);
    }
  };

  return { messages, isStreaming, sendMessage };
}
