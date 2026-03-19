import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatInput } from "../ChatInput";

describe("ChatInput", () => {
  it("calls onSend with the trimmed message and clears the input", async () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} isStreaming={false} />);

    await userEvent.type(screen.getByRole("textbox"), "  Hello  ");
    await userEvent.click(screen.getByRole("button"));

    expect(onSend).toHaveBeenCalledWith("Hello");
    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  it("does not call onSend for a blank message", async () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} isStreaming={false} />);

    await userEvent.type(screen.getByRole("textbox"), "   ");
    await userEvent.click(screen.getByRole("button"));

    expect(onSend).not.toHaveBeenCalled();
  });

  it("submits on Enter and not on Shift+Enter", async () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} isStreaming={false} />);

    await userEvent.type(screen.getByRole("textbox"), "Hello{shift>}{enter}{/shift}");
    expect(onSend).not.toHaveBeenCalled();

    await userEvent.type(screen.getByRole("textbox"), "{enter}");
    expect(onSend).toHaveBeenCalledWith("Hello");
  });

  it("disables the textarea and button while streaming", () => {
    render(<ChatInput onSend={vi.fn()} isStreaming={true} />);
    expect(screen.getByRole("textbox")).toBeDisabled();
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("truncates input at 1000 characters", () => {
    render(<ChatInput onSend={vi.fn()} isStreaming={false} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "a".repeat(1100) } });
    expect(screen.getByRole("textbox")).toHaveValue("a".repeat(1000));
  });
});
