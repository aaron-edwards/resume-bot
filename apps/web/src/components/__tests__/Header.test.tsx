import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Header } from "../Header";

beforeEach(() => {
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Header", () => {
  it("renders the title", () => {
    render(<Header title="Aaron's ResumeBot" onReset={vi.fn()} />);
    expect(screen.getByRole("heading")).toHaveTextContent("Aaron's ResumeBot");
  });

  it("calls onReset when reset is confirmed", async () => {
    const onReset = vi.fn();
    render(<Header title="Aaron's ResumeBot" onReset={onReset} />);

    await userEvent.click(screen.getByRole("button", { name: /reset/i }));

    expect(window.confirm).toHaveBeenCalled();
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("does not call onReset when reset is cancelled", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const onReset = vi.fn();
    render(<Header title="Aaron's ResumeBot" onReset={onReset} />);

    await userEvent.click(screen.getByRole("button", { name: /reset/i }));

    expect(onReset).not.toHaveBeenCalled();
  });

  it("renders nav links for CV, LinkedIn and GitHub", () => {
    render(<Header title="Aaron's ResumeBot" onReset={vi.fn()} />);
    expect(screen.getByRole("link", { name: /cv/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /linkedin/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /github/i })).toBeInTheDocument();
  });
});
