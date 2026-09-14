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

  it("renders nav links for back-to-chat, about, CV, LinkedIn and GitHub", () => {
    renderHeader({ title: "Aaron's ResumeBot", onReset: vi.fn() });
    expect(screen.getByRole("link", { name: /back to chat/i })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: /about/i })).toHaveAttribute("href", "/about");
    expect(screen.getByRole("link", { name: /cv/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /linkedin/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /github/i })).toBeInTheDocument();
  });
});
