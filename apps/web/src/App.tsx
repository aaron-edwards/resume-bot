import { useEffect, useRef, useState } from "react";
import { Button } from "@repo/ui/button";
import { Textarea } from "@repo/ui/textarea";
import { useChat } from "./hooks/useChat";

export default function App() {
  const { messages, isStreaming, sendMessage } = useChat();
  const [input, setInput] = useState("");
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    const message = input.trim();
    if (!message) return;
    setInput("");
    sendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto p-4 gap-4">
      <div ref={transcriptRef} className="flex-1 overflow-y-auto flex flex-col gap-4">
        {messages.length === 0 && (
          <p className="text-muted-foreground text-sm text-center mt-8">
            Ask me anything about my experience.
          </p>
        )}
        {messages.map((message, i) => (
          <div
            key={i}
            className={`flex flex-col gap-1 ${message.role === "user" ? "items-end" : "items-start"}`}
          >
            <span className="text-xs text-muted-foreground">
              {message.role === "user" ? "You" : "Assistant"}
            </span>
            <div
              className={`rounded-lg px-4 py-2 max-w-[85%] text-sm whitespace-pre-wrap ${
                message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}
            >
              {message.content}
              {message.role === "assistant" && isStreaming && i === messages.length - 1 && (
                <span className="animate-pulse">▋</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about my experience... (Enter to send, Shift+Enter for new line)"
          rows={3}
          disabled={isStreaming}
          className="resize-none"
        />
        <Button onClick={handleSend} disabled={!input.trim() || isStreaming}>
          {isStreaming ? "Thinking..." : "Send"}
        </Button>
      </div>
    </div>
  );
}
