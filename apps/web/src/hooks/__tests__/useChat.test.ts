import { vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type React from "react";
import { createElement } from "react";
import { useChat } from "../useChat";

const GREETING = vi.hoisted(() => [{ role: "assistant" as const, content: "Hi! I'm Aaron's ResumeBot." }]);

vi.mock("../../lib/api", () => ({
  getSessionMessages: vi.fn().mockResolvedValue(GREETING),
  streamChatResponse: vi.fn(),
}));

import { getSessionMessages, streamChatResponse } from "../../lib/api";

async function* mockStream(chunks: string[]) {
  for (const chunk of chunks) yield chunk;
}

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return createElement(QueryClientProvider, { client: queryClient }, children);
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getSessionMessages).mockResolvedValue(GREETING);
  vi.stubGlobal("localStorage", localStorageMock);
  localStorageMock.clear();
});

describe("useChat", () => {
  it("shows messages returned from the session store on load", async () => {
    const greeting = [{ role: "assistant" as const, content: "Hi! I'm Aaron's ResumeBot." }];
    vi.mocked(getSessionMessages).mockResolvedValue(greeting);

    const { result } = renderHook(() => useChat(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.messages).toEqual(greeting);
  });

  it("primes with existing history from the session store", async () => {
    const history = [
      { role: "user" as const, content: "Hello" },
      { role: "assistant" as const, content: "Hi there!" },
    ];
    vi.mocked(getSessionMessages).mockResolvedValue(history);

    const { result } = renderHook(() => useChat(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.messages).toEqual(history);
  });

  it("adds user message and empty assistant placeholder immediately", async () => {
    vi.mocked(streamChatResponse).mockReturnValue(mockStream([]));

    const { result } = renderHook(() => useChat(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.sendMessage("Hello");
    });

    expect(result.current.messages[1]).toEqual({ role: "user", content: "Hello" });
    expect(result.current.messages[2]).toEqual({ role: "assistant", content: "" });
  });

  it("appends streamed chunks to the assistant message", async () => {
    vi.mocked(streamChatResponse).mockReturnValue(mockStream(["Hello", " world"]));

    const { result } = renderHook(() => useChat(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.sendMessage("Hi");
    });

    expect(result.current.messages[2]).toEqual({ role: "assistant", content: "Hello world" });
  });

  it("sets isStreaming to false after stream completes", async () => {
    vi.mocked(streamChatResponse).mockReturnValue(mockStream([]));

    const { result } = renderHook(() => useChat(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.sendMessage("Hi");
    });

    expect(result.current.isStreaming).toBe(false);
  });

  it("does nothing when called with a blank message", async () => {
    const greeting = [{ role: "assistant" as const, content: "Hi!" }];
    vi.mocked(getSessionMessages).mockResolvedValue(greeting);

    const { result } = renderHook(() => useChat(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.sendMessage("   ");
    });

    expect(vi.mocked(streamChatResponse)).not.toHaveBeenCalled();
    expect(result.current.messages).toHaveLength(1);
  });

  it("sets error and removes the assistant placeholder when the stream throws", async () => {
    vi.mocked(streamChatResponse).mockImplementation(async function* () {
      throw new Error("API error");
    });

    const { result } = renderHook(() => useChat(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.sendMessage("Hi");
    });

    expect(result.current.error).toBeTruthy();
    // greeting + user message (failed assistant placeholder is removed)
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[1]).toEqual({ role: "user", content: "Hi" });
  });

  it("resets messages and generates a new session on resetSession", async () => {
    vi.mocked(streamChatResponse).mockReturnValue(mockStream([]));

    const { result } = renderHook(() => useChat(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.sendMessage("Hello");
    });

    expect(result.current.messages.length).toBeGreaterThan(1);

    const sessionIdBefore = localStorageMock.getItem("resumebot-session-id");

    act(() => {
      result.current.resetSession();
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const sessionIdAfter = localStorageMock.getItem("resumebot-session-id");
    expect(sessionIdAfter).not.toBe(sessionIdBefore);
  });

  it("clears the error on the next successful send", async () => {
    vi.mocked(streamChatResponse).mockImplementationOnce(async function* () {
      throw new Error("API error");
    });

    const { result } = renderHook(() => useChat(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.sendMessage("Hi");
    });
    expect(result.current.error).toBeTruthy();

    vi.mocked(streamChatResponse).mockReturnValue(mockStream([]));
    await act(async () => {
      await result.current.sendMessage("Hi again");
    });

    expect(result.current.error).toBeNull();
  });
});
