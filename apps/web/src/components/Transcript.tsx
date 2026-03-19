import { useEffect, useRef } from "react";
import type { ChatMessage } from "../hooks/useChat";
import { MessageBubble } from "./MessageBubble";

type TranscriptProps = {
  messages: ChatMessage[];
  isStreaming: boolean;
};

export function Transcript({ messages, isStreaming }: TranscriptProps) {
  const ref = useRef<HTMLUListElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on both new messages and streaming content updates
  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [messages]);

  return (
    <ul ref={ref} className="flex-1 overflow-y-auto flex flex-col gap-4 list-none">
      {messages.map((message, i) => (
        <MessageBubble
          // biome-ignore lint/suspicious/noArrayIndexKey: messages are append-only and never reordered
          key={i}
          message={message}
          isStreaming={isStreaming}
        />
      ))}
    </ul>
  );
}
