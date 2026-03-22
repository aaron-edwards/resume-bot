import type { GoogleGenAI } from "@google/genai";
import { streamChat } from "../chat.js";

async function* fakeStream(chunks: Array<{ text?: string }>) {
  for (const chunk of chunks) {
    yield chunk;
  }
}

async function collect(gen: AsyncGenerator<string>): Promise<string[]> {
  const results: string[] = [];
  for await (const value of gen) {
    results.push(value);
  }
  return results;
}

function makeClient(stream: ReturnType<typeof fakeStream>) {
  return {
    models: { generateContentStream: vi.fn().mockResolvedValue(stream) },
  } as unknown as GoogleGenAI;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("streamChat", () => {
  it("yields text from each chunk", async () => {
    const client = makeClient(fakeStream([{ text: "Hello" }, { text: " world" }]));

    const chunks = await collect(streamChat(client, [{ role: "user", content: "Hi" }]));
    expect(chunks).toEqual(["Hello", " world"]);
  });

  it("skips chunks with no text", async () => {
    const client = makeClient(fakeStream([{ text: "Hello" }, {}, { text: "world" }]));

    const chunks = await collect(streamChat(client, [{ role: "user", content: "Hi" }]));
    expect(chunks).toEqual(["Hello", "world"]);
  });

  it("maps assistant role to model", async () => {
    const client = makeClient(fakeStream([]));

    await collect(
      streamChat(client, [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi there" },
        { role: "user", content: "How are you?" },
      ])
    );

    expect(client.models.generateContentStream).toHaveBeenCalledWith(
      expect.objectContaining({
        contents: [
          { role: "user", parts: [{ text: "Hello" }] },
          { role: "model", parts: [{ text: "Hi there" }] },
          { role: "user", parts: [{ text: "How are you?" }] },
        ],
      })
    );
  });

  it("limits messages to the last 50", async () => {
    const client = makeClient(fakeStream([]));

    const messages = Array.from({ length: 52 }, (_, i) => ({
      role: i % 2 === 0 ? ("user" as const) : ("assistant" as const),
      content: `message ${i}`,
    }));

    await collect(streamChat(client, messages));

    // biome-ignore lint/style/noNonNullAssertion: mock is guaranteed to have been called
    const { contents } = (client.models.generateContentStream as ReturnType<typeof vi.fn>).mock
      .calls[0]![0];
    expect(contents).toHaveLength(50);
    expect(contents[0]).toEqual({ role: "user", parts: [{ text: "message 2" }] });
  });

  it("includes the system instruction", async () => {
    const client = makeClient(fakeStream([]));

    await collect(streamChat(client, [{ role: "user", content: "Hi" }]));

    expect(client.models.generateContentStream).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          systemInstruction: expect.stringContaining("resume"),
        }),
      })
    );
  });
});
