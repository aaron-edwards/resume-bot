import { Button } from "@repo/ui/button";
import { Textarea } from "@repo/ui/textarea";
import { SendHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type ChatInputProps = {
  onSend: (message: string) => void;
  isStreaming: boolean;
};

export function ChatInput({ onSend, isStreaming }: ChatInputProps) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isStreaming && !window.matchMedia("(pointer: coarse)").matches) {
      inputRef.current?.focus();
    }
  }, [isStreaming]);

  const handleSend = () => {
    const message = input.trim();
    if (!message) return;
    setInput("");
    onSend(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="relative">
        <Textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value.slice(0, 1000))}
          onKeyDown={handleKeyDown}
          placeholder="Ask about my experience."
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
        <span
          className={`text-xs shrink-0 ml-2 ${input.length >= 1000 ? "text-destructive" : "text-muted-foreground"} ${input.length <= 800 ? "invisible" : ""}`}
        >
          {input.length}/1000
        </span>
      </div>
    </div>
  );
}
