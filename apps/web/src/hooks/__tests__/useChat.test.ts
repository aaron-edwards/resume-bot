import { vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type React from "react";
import { createElement } from "react";
import { useChat } from "../useChat";

vi.mock("../../lib/api", () => ({
  getSessionMessages: vi.fn(),
  resetSessionRequest: vi.fn(),
  streamChatResponse: vi.fn(),
}));

import { getSessionMessages, resetSessionRequest, streamChatResponse } from "../../lib/api";

const GREETING = vi.hoisted(() => [{ role: "assistant" as const, content: "Hi! I'm Aaron's ResumeBot." }]);

async function* mockStream(chunks: string[]) {
  for (const chunk of chunks) yield chunk;
}

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return createElement(QueryClientProvider, { client: queryClient }, children);
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getSessionMessages).mockResolvedValue(GREETING);
  vi.mocked(resetSessionRequest).mockResolvedValue(GREETING);
});

describe("useChat", () => {
  it("shows messages returned from the session store on load", async () => {
    const { result } = renderHook(() => useChat(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.messages).toEqual(GREETING);
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

  it("resets messages when resetSession is called", async () => {
    vi.mocked(streamChatResponse).mockReturnValue(mockStream([]));
    const newGreeting = [{ role: "assistant" as const, content: "Hi again!" }];
    vi.mocked(resetSessionRequest).mockResolvedValue(newGreeting);

    const { result } = renderHook(() => useChat(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.sendMessage("Hello");
    });
    expect(result.current.messages.length).toBeGreaterThan(1);

    await act(async () => {
      await result.current.resetSession();
    });

    expect(result.current.messages).toEqual(newGreeting);
    expect(result.current.error).toBeNull();
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
