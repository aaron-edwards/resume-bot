import { vi } from "vitest";
import { streamChatResponse, getSessionMessages, resetSessionRequest } from "../api";

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

function mockFetch(stream: ReadableStream) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, body: stream }));
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

async function collect(gen: AsyncGenerator<string>): Promise<string[]> {
  const results: string[] = [];
  for await (const value of gen) {
    results.push(value);
  }
  return results;
}

describe("getSessionMessages", () => {
  it("fetches session with credentials and returns messages", async () => {
    const messages = [{ role: "assistant", content: "Hi!" }];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ messages }),
    }));

    const result = await getSessionMessages();

    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining("/session"),
      expect.objectContaining({ credentials: "include" })
    );
    expect(result).toEqual(messages);
  });

  it("returns empty array on error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    expect(await getSessionMessages()).toEqual([]);
  });
});

describe("resetSessionRequest", () => {
  it("posts to /session/reset with credentials and returns messages", async () => {
    const messages = [{ role: "assistant", content: "Hi!" }];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ messages }),
    }));

    const result = await resetSessionRequest();

    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining("/session/reset"),
      expect.objectContaining({ method: "POST", credentials: "include" })
    );
    expect(result).toEqual(messages);
  });
});

describe("streamChatResponse", () => {
  it("sends message with credentials in the request body", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, body: createSseStream(["[DONE]"]) });
    vi.stubGlobal("fetch", fetchSpy);

    await collect(streamChatResponse("Hello"));

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/chat"),
      expect.objectContaining({
        credentials: "include",
        body: JSON.stringify({ message: "Hello" }),
      })
    );
  });

  it("yields text from each chunk", async () => {
    mockFetch(
      createSseStream([JSON.stringify({ text: "Hello" }), JSON.stringify({ text: " world" })])
    );

    const chunks = await collect(streamChatResponse("Hi"));
    expect(chunks).toEqual(["Hello", " world"]);
  });

  it("stops yielding at [DONE]", async () => {
    mockFetch(
      createSseStream([JSON.stringify({ text: "Hello" }), "[DONE]", JSON.stringify({ text: "ignored" })])
    );

    const chunks = await collect(streamChatResponse("Hi"));
    expect(chunks).toEqual(["Hello"]);
  });

  it("throws when the stream contains an error event", async () => {
    mockFetch(createSseStream([JSON.stringify({ error: "something went wrong" })]));

    await expect(collect(streamChatResponse("Hi"))).rejects.toThrow("something went wrong");
  });

  it("yields nothing when stream is empty", async () => {
    mockFetch(createSseStream([]));
    expect(await collect(streamChatResponse("Hi"))).toEqual([]);
  });
});
