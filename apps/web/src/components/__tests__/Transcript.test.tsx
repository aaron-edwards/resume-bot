import { render, screen } from "@testing-library/react";
import { Transcript } from "../Transcript";

const messages = [
  { role: "user" as const, content: "Hello" },
  { role: "assistant" as const, content: "Hi there" },
];

describe("Transcript", () => {
  it("renders all messages", () => {
    render(<Transcript messages={messages} isStreaming={false} />);
    expect(screen.getByText("Hello")).toBeDefined();
    expect(screen.getByText("Hi there")).toBeDefined();
  });

  it("renders an empty list when there are no messages", () => {
    render(<Transcript messages={[]} isStreaming={false} />);
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });

  it("shows typing indicator on last assistant message when streaming", () => {
    const streamingMessages = [
      { role: "user" as const, content: "Hello" },
      { role: "assistant" as const, content: "" },
    ];
    render(<Transcript messages={streamingMessages} isStreaming={true} />);
    expect(screen.getByRole("status")).toBeDefined();
  });

  it("does not show typing indicator when not streaming", () => {
    const streamingMessages = [
      { role: "user" as const, content: "Hello" },
      { role: "assistant" as const, content: "" },
    ];
    render(<Transcript messages={streamingMessages} isStreaming={false} />);
    expect(screen.queryByRole("status")).toBeNull();
  });
});
