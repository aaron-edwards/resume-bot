import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Header } from "../Header";

function renderHeader(props: Parameters<typeof Header>[0]) {
  return render(<Header {...props} />, { wrapper: MemoryRouter });
}

describe("Header", () => {
  it("renders the title", () => {
    renderHeader({ title: "Aaron's ResumeBot", onReset: vi.fn() });
    expect(screen.getByRole("heading")).toHaveTextContent("Aaron's ResumeBot");
  });

  it("calls onReset when reset is confirmed in the dialog", async () => {
    const onReset = vi.fn();
    renderHeader({ title: "Aaron's ResumeBot", onReset });

    await userEvent.click(screen.getByRole("button", { name: /reset/i }));
    const dialog = screen.getByRole("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: /reset/i }));

    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("does not call onReset when cancel is clicked", async () => {
    const onReset = vi.fn();
    renderHeader({ title: "Aaron's ResumeBot", onReset });

    await userEvent.click(screen.getByRole("button", { name: /reset/i }));
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onReset).not.toHaveBeenCalled();
  });

  it("does not render a reset button when onReset is omitted", () => {
    renderHeader({ title: "About" });
    expect(screen.queryByRole("button", { name: /reset/i })).not.toBeInTheDocument();
  });

  it("renders nav links for back-to-chat, CV, LinkedIn and GitHub", () => {
    renderHeader({ title: "Aaron's ResumeBot", onReset: vi.fn() });
    expect(screen.getByRole("link", { name: /back to chat/i })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: /cv/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /linkedin/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /github/i })).toBeInTheDocument();
  });

  it("renders the about link only when showAbout is set", () => {
    const { rerender } = renderHeader({ title: "Aaron's ResumeBot" });
    expect(screen.queryByRole("link", { name: /about/i })).not.toBeInTheDocument();

    rerender(<Header title="Aaron's ResumeBot" showAbout />);
    expect(screen.getByRole("link", { name: /about/i })).toHaveAttribute("href", "/about");
  });

  it("renders the chat nav link only when showHome is set", () => {
    const { rerender } = renderHeader({ title: "About" });
    expect(screen.getAllByRole("link", { name: /back to chat/i })).toHaveLength(1);

    rerender(<Header title="About" showHome />);
    const backLinks = screen.getAllByRole("link", { name: /back to chat/i });
    expect(backLinks).toHaveLength(2);
    for (const link of backLinks) expect(link).toHaveAttribute("href", "/");
  });
});
