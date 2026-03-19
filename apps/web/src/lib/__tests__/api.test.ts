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
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ body: stream }));
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

  it("skips lines without data: prefix", async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`event: start\ndata: ${JSON.stringify({ text: "Hello" })}\n\n`));
        controller.close();
      },
    });
    mockFetch(stream);

    const chunks = await collect(streamChatResponse("Hi"));
    expect(chunks).toEqual(["Hello"]);
  });

  it("skips chunks with no text field", async () => {
    mockFetch(
      createSseStream([JSON.stringify({ error: "something went wrong" }), JSON.stringify({ text: "Hello" })])
    );

    const chunks = await collect(streamChatResponse("Hi"));
    expect(chunks).toEqual(["Hello"]);
  });

  it("yields nothing when stream is empty", async () => {
    mockFetch(createSseStream([]));

    const chunks = await collect(streamChatResponse("Hi"));
    expect(chunks).toEqual([]);
  });
});
