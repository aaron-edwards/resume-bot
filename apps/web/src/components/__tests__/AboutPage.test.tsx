// @vitest-environment jsdom
//
// happy-dom's innerHTML serialization mangles mermaid's SVG outputs
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AboutPage } from "../AboutPage";

it("renders the whole about page, including the architecture diagram", async () => {
  const { container } = render(<AboutPage />, { wrapper: MemoryRouter });

  // Wait for mermaid's async render to land before snapshotting.
  await screen.findByRole("img", { name: /mermaid diagram/i });

  // Mermaid embeds a fresh `mermaid-<id>-<timestamp>` string throughout the
  // page (ids, aria-roledescription refs, etc.) on every render. Normalize
  // it on a detached clone and snapshot the element itself, so pretty-format
  // still indents it as markup.
  const clone = container.cloneNode(true) as HTMLElement;
  clone.innerHTML = clone.innerHTML.replace(/mermaid-[\w-]+-\d+/g, "mermaid-ID");

  expect(clone).toMatchSnapshot();
});
