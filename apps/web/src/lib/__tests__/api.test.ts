import { vi } from "vitest";
import { streamChatResponse } from "../api";

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

describe("streamChatResponse", () => {
  it("sends message and sessionId in the request body", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, body: createSseStream(["[DONE]"]) });
    vi.stubGlobal("fetch", fetchSpy);

    await collect(streamChatResponse("Hello", "session-1"));

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/chat"),
      expect.objectContaining({
        body: JSON.stringify({ message: "Hello", sessionId: "session-1" }),
      })
    );
  });

  it("yields text from each chunk", async () => {
    mockFetch(
      createSseStream([JSON.stringify({ text: "Hello" }), JSON.stringify({ text: " world" })])
    );

    const chunks = await collect(streamChatResponse("Hi", "session-1"));
    expect(chunks).toEqual(["Hello", " world"]);
  });

  it("stops yielding at [DONE]", async () => {
    mockFetch(
      createSseStream([JSON.stringify({ text: "Hello" }), "[DONE]", JSON.stringify({ text: "ignored" })])
    );

    const chunks = await collect(streamChatResponse("Hi", "session-1"));
    expect(chunks).toEqual(["Hello"]);
  });

  it("skips lines without data: prefix", async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`event: start\ndata: ${JSON.stringify({ text: "Hello" })}\n\n`));
        controller.close();
      },
    });
    mockFetch(stream);

    const chunks = await collect(streamChatResponse("Hi", "session-1"));
    expect(chunks).toEqual(["Hello"]);
  });

  it("throws when the stream contains an error event", async () => {
    mockFetch(createSseStream([JSON.stringify({ error: "something went wrong" })]));

    await expect(collect(streamChatResponse("Hi", "session-1"))).rejects.toThrow(
      "something went wrong"
    );
  });

  it("yields nothing when stream is empty", async () => {
    mockFetch(createSseStream([]));

    const chunks = await collect(streamChatResponse("Hi", "session-1"));
    expect(chunks).toEqual([]);
  });
});
