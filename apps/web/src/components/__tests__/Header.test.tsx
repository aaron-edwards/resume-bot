import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Header } from "../Header";

describe("Header", () => {
  it("renders the title", () => {
    render(<Header title="Aaron's ResumeBot" onReset={vi.fn()} />);
    expect(screen.getByRole("heading")).toHaveTextContent("Aaron's ResumeBot");
  });

  it("calls onReset when reset is confirmed in the dialog", async () => {
    const onReset = vi.fn();
    render(<Header title="Aaron's ResumeBot" onReset={onReset} />);

    await userEvent.click(screen.getByRole("button", { name: /reset/i }));
    const dialog = screen.getByRole("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: /reset/i }));

    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("does not call onReset when cancel is clicked", async () => {
    const onReset = vi.fn();
    render(<Header title="Aaron's ResumeBot" onReset={onReset} />);

    await userEvent.click(screen.getByRole("button", { name: /reset/i }));
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onReset).not.toHaveBeenCalled();
  });

  it("renders nav links for CV, LinkedIn and GitHub", () => {
    render(<Header title="Aaron's ResumeBot" onReset={vi.fn()} />);
    expect(screen.getByRole("link", { name: /cv/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /linkedin/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /github/i })).toBeInTheDocument();
  });
});
