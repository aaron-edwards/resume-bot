import { vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useChat } from "../useChat";

function createSseStream(events: string[]) {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const event of events) {
        controller.enqueue(encoder.encode(`data: ${event}\n\n`));
      }
      controller.close();
    },
  });
}

function mockFetch(streamFactory: () => ReadableStream) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(() => Promise.resolve({ body: streamFactory() }))
  );
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("useChat", () => {
  it("adds user message and empty assistant placeholder immediately", async () => {
    mockFetch(() => createSseStream(["[DONE]"]));

    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage("Hello");
    });

    expect(result.current.messages[0]).toEqual({ role: "user", content: "Hello" });
    expect(result.current.messages[1]).toEqual({ role: "assistant", content: "" });
  });

  it("appends streamed chunks to the assistant message", async () => {
    mockFetch(() =>
      createSseStream([
        JSON.stringify({ text: "Hello" }),
        JSON.stringify({ text: " world" }),
        "[DONE]",
      ])
    );

    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage("Hi");
    });

    expect(result.current.messages[1]).toEqual({
      role: "assistant",
      content: "Hello world",
    });
  });

  it("sets isStreaming to false after stream completes", async () => {
    mockFetch(() => createSseStream(["[DONE]"]));

    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage("Hi");
    });

    expect(result.current.isStreaming).toBe(false);
  });

  it("does nothing when called with a blank message", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage("   ");
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.current.messages).toHaveLength(0);
  });

  it("does nothing when already streaming", async () => {
    const fetchSpy = vi.fn().mockImplementation(() =>
      Promise.resolve({ body: new ReadableStream({ start() {} }) })
    );
    vi.stubGlobal("fetch", fetchSpy);

    const { result } = renderHook(() => useChat());

    act(() => {
      result.current.sendMessage("First");
    });

    await waitFor(() => expect(result.current.isStreaming).toBe(true));

    await act(async () => {
      await result.current.sendMessage("Second");
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
