import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { createElement } from "react";
import App from "../App";
import { GREETING, mockChatResponse, server } from "../test/server";

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return createElement(QueryClientProvider, { client: queryClient }, children);
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
    http.post("http://localhost:3001/chat", () => new HttpResponse(null, { status: 500 }))
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
