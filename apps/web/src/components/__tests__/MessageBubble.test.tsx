import { render as rtlRender, screen } from "@testing-library/react";
import type { RenderOptions } from "@testing-library/react";
import type React from "react";
import { MessageBubble } from "../MessageBubble";

const userMessage = { role: "user" as const, content: "Hello there" };
const assistantMessage = { role: "assistant" as const, content: "Hi! How can I help?" };

const render = (ui: React.ReactElement, options?: Omit<RenderOptions, "wrapper">) =>
  rtlRender(ui, { wrapper: ({ children }) => <ul>{children}</ul>, ...options });

describe("MessageBubble", () => {
  describe("labels", () => {
    it("labels user messages as 'You'", () => {
      render(<MessageBubble message={userMessage} isStreaming={false} />);
      expect(screen.getByRole("listitem", { name: "You" })).toBeDefined();
    });

    it("labels assistant messages as 'ResumeBot'", () => {
      render(<MessageBubble message={assistantMessage} isStreaming={false} />);
      expect(screen.getByRole("listitem", { name: "ResumeBot" })).toBeDefined();
    });
  });

  describe("user messages", () => {
    it("renders content as plain text", () => {
      render(<MessageBubble message={userMessage} isStreaming={false} />);
      expect(screen.getByText("Hello there")).toBeDefined();
    });
  });

  describe("assistant messages", () => {
    it("renders content as markdown", () => {
      const message = { role: "assistant" as const, content: "**bold text**" };
      render(<MessageBubble message={message} isStreaming={false} />);
      expect(screen.getByText("bold text").tagName).toBe("STRONG");
    });

    it("renders markdown links", () => {
      const message = { role: "assistant" as const, content: "[click here](https://example.com)" };
      render(<MessageBubble message={message} isStreaming={false} />);
      const link = screen.getByRole("link", { name: "click here" });
      expect(link.getAttribute("href")).toBe("https://example.com");
    });
  });

  describe("typing indicator", () => {
    it("shows when streaming and content is empty", () => {
      const message = { role: "assistant" as const, content: "" };
      render(<MessageBubble message={message} isStreaming={true} />);
      expect(screen.getByRole("status")).toBeDefined();
    });

    it("does not show when not streaming", () => {
      const message = { role: "assistant" as const, content: "" };
      render(<MessageBubble message={message} isStreaming={false} />);
      expect(screen.queryByRole("status")).toBeNull();
    });

    it("does not show when content is not empty", () => {
      render(<MessageBubble message={assistantMessage} isStreaming={true} />);
      expect(screen.queryByRole("status")).toBeNull();
    });
  });
});
