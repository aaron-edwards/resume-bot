import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { createElement } from "react";
import { MemoryRouter } from "react-router-dom";
import App from "../App";
import { GREETING, mockChatResponse, server } from "../test/server";

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return createElement(
    QueryClientProvider,
    { client: queryClient },
    createElement(MemoryRouter, null, children)
  );
}

function renderApp() {
  return render(<App />, { wrapper });
}

it("happy path: start session → reply → streaming → reset → greeting", async () => {
  const flush = mockChatResponse(["I'm", " Aaron's", " bot!"]);

  renderApp();

  // Session loads with greeting
  await screen.findByText(GREETING[0].content);

  // User sends a message
  await userEvent.type(screen.getByRole("textbox"), "Who are you?");
  await userEvent.click(screen.getByRole("button", { name: /send/i }));

  // User message is visible and typing indicator appears while stream is paused
  expect(screen.getByText("Who are you?")).toBeInTheDocument();
  await screen.findByRole("status"); // TypingIndicator (<output>)

  // Stream completes
  flush();
  await screen.findByText("I'm Aaron's bot!");

  // Reset back to greeting — open dialog then confirm
  await userEvent.click(screen.getByRole("button", { name: /reset/i }));
  await userEvent.click(
    within(screen.getByRole("alertdialog")).getByRole("button", { name: /reset/i })
  );
  await screen.findByText(GREETING[0].content);
  expect(screen.queryByText("Who are you?")).not.toBeInTheDocument();
});

it("error path: send message → see error → reset clears it", async () => {
  server.use(
    http.post("http://localhost:3001/api/chat", () => new HttpResponse(null, { status: 500 }))
  );

  renderApp();
  await screen.findByText(GREETING[0].content);

  // Send a message that will fail
  await userEvent.type(screen.getByRole("textbox"), "Hello");
  await userEvent.click(screen.getByRole("button", { name: /send/i }));

  // Error is shown and the failed assistant placeholder is removed
  await screen.findByText(/something went wrong/i);
  expect(screen.queryByRole("status")).not.toBeInTheDocument();

  // Reset clears the error and restores the greeting — open dialog then confirm
  await userEvent.click(screen.getByRole("button", { name: /reset/i }));
  await userEvent.click(
    within(screen.getByRole("alertdialog")).getByRole("button", { name: /reset/i })
  );
  await screen.findByText(GREETING[0].content);
  expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
});

it("navigates to the about page and back", async () => {
  renderApp();
  await screen.findByText(GREETING[0].content);

  await userEvent.click(screen.getByRole("link", { name: /about/i }));
  expect(screen.getByText(/what is this thing/i)).toBeInTheDocument();

  const backLinks = screen.getAllByRole("link", { name: /back to chat/i });
  await userEvent.click(backLinks[backLinks.length - 1]);
  expect(screen.queryByText(/what is this thing/i)).not.toBeInTheDocument();
  await screen.findByText(GREETING[0].content);
});
