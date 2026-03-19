import { useEffect, useRef, useState } from "react";
import { SendHorizontal } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@repo/ui/button";
import { Textarea } from "@repo/ui/textarea";
import { useChat } from "./hooks/useChat";

export default function App() {
  const { messages, isStreaming, error, sendMessage } = useChat();
  const [input, setInput] = useState("");
  const transcriptRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!isStreaming && !window.matchMedia("(pointer: coarse)").matches) {
      inputRef.current?.focus();
    }
  }, [isStreaming]);

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
    <div className="flex flex-col h-dvh">
      <header className="border-b px-4 py-3 flex items-center gap-3">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect x="6" y="10" width="20" height="16" rx="3" fill="currentColor" className="text-primary" />
          <rect x="6" y="10" width="20" height="16" rx="3" fill="oklch(0.55 0.15 185)" />
          <circle cx="11.5" cy="17" r="2.5" fill="white" />
          <circle cx="20.5" cy="17" r="2.5" fill="white" />
          <circle cx="11.5" cy="17" r="1" fill="oklch(0.55 0.15 185)" />
          <circle cx="20.5" cy="17" r="1" fill="oklch(0.55 0.15 185)" />
          <rect x="12" y="22" width="8" height="2" rx="1" fill="white" />
          <rect x="14" y="6" width="4" height="5" rx="1" fill="oklch(0.55 0.15 185)" />
          <circle cx="16" cy="5" r="2" fill="oklch(0.55 0.15 185)" />
          <rect x="4" y="14" width="2" height="5" rx="1" fill="oklch(0.55 0.15 185)" />
          <rect x="26" y="14" width="2" height="5" rx="1" fill="oklch(0.55 0.15 185)" />
        </svg>
        <h1 className="text-lg font-semibold">Aaron's ResumeBot</h1>
      </header>
      <div className="flex flex-col flex-1 overflow-hidden max-w-2xl w-full mx-auto p-4 gap-4">
      <div ref={transcriptRef} className="flex-1 overflow-y-auto flex flex-col gap-4">
{messages.map((message, i) => (
          <div
            key={i}
            className={`flex flex-col gap-1 ${message.role === "user" ? "items-end" : "items-start"}`}
          >
            <span className="text-xs text-muted-foreground">
              {message.role === "user" ? "You" : "ResumeBot"}
            </span>
            <div
              className={`rounded-lg px-4 py-2 max-w-[85%] text-sm ${
                message.role === "user" ? "bg-foreground text-background whitespace-pre-wrap break-words" : "bg-muted prose prose-sm max-w-none break-words"
              }`}
            >
              {message.role === "user" ? message.content : (
                <>
                  {isStreaming && i === messages.length - 1 && message.content === "" ? (
                    <span className="flex gap-1 items-center h-5">
                      {[0, 150, 300].map((delay) => (
                        <span
                          key={delay}
                          className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce"
                          style={{ animationDelay: `${delay}ms` }}
                        />
                      ))}
                    </span>
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}
      <div className="flex flex-col gap-1">
        <div className="relative">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, 1000))}
            onKeyDown={handleKeyDown}
            placeholder="Ask about my experience... (Enter to send, Shift+Enter for new line)"
            rows={3}
            disabled={isStreaming}
            className="resize-none pr-12"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            variant="default"
            size="icon"
            className="absolute bottom-2 right-2"
          >
            <SendHorizontal className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex justify-between items-start">
          <span className="text-xs text-muted-foreground">
            ResumeBot can make mistakes. Consider verifying important information.
          </span>
          <span className={`text-xs shrink-0 ml-2 ${input.length >= 1000 ? "text-destructive" : "text-muted-foreground"} ${input.length <= 800 ? "invisible" : ""}`}>
            {input.length}/1000
          </span>
        </div>
      </div>
    </div>
    </div>
  );
}
