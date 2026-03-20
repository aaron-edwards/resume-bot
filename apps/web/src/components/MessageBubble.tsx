import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "../hooks/useChat";
import { TypingIndicator } from "./TypingIndicator";

type MessageBubbleProps = {
  message: ChatMessage;
  isStreaming: boolean;
};

const baseBubbleClass = "rounded-lg px-4 py-2 max-w-[85%] text-sm break-words";
const userBubbleClass = "bg-foreground text-background whitespace-pre-wrap";
const assistantBubbleClass = "bg-muted prose prose-sm max-w-none";

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const showTypingIndicator = !isUser && isStreaming && message.content === "";

  const label = isUser ? "You" : "ResumeBot";

  return (
    <li
      aria-label={label}
      className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}
    >
      <span className="text-xs text-muted-foreground" aria-hidden="true">
        {label}
      </span>
      <div className={`${baseBubbleClass} ${isUser ? userBubbleClass : assistantBubbleClass}`}>
        {isUser ? (
          message.content
        ) : showTypingIndicator ? (
          <TypingIndicator />
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
        )}
      </div>
    </li>
  );
}
