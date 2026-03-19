import { vi } from "vitest";
import { streamChat } from "../gemini.js";

const mockGenerateContentStream = vi.hoisted(() => vi.fn());

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: { generateContentStream: mockGenerateContentStream },
  })),
}));

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

beforeEach(() => {
  vi.clearAllMocks();
});

describe("streamChat", () => {
  it("yields text from each chunk", async () => {
    mockGenerateContentStream.mockResolvedValue(
      fakeStream([{ text: "Hello" }, { text: " world" }])
    );

    const chunks = await collect(streamChat([{ role: "user", content: "Hi" }]));
    expect(chunks).toEqual(["Hello", " world"]);
  });

  it("skips chunks with no text", async () => {
    mockGenerateContentStream.mockResolvedValue(
      fakeStream([{ text: "Hello" }, {}, { text: "world" }])
    );

    const chunks = await collect(streamChat([{ role: "user", content: "Hi" }]));
    expect(chunks).toEqual(["Hello", "world"]);
  });

  it("maps assistant role to model", async () => {
    mockGenerateContentStream.mockResolvedValue(fakeStream([]));

    await collect(
      streamChat([
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi there" },
        { role: "user", content: "How are you?" },
      ])
    );

    expect(mockGenerateContentStream).toHaveBeenCalledWith(
      expect.objectContaining({
        contents: [
          { role: "user", parts: [{ text: "Hello" }] },
          { role: "model", parts: [{ text: "Hi there" }] },
          { role: "user", parts: [{ text: "How are you?" }] },
        ],
      })
    );
  });

  it("includes the system instruction", async () => {
    mockGenerateContentStream.mockResolvedValue(fakeStream([]));

    await collect(streamChat([{ role: "user", content: "Hi" }]));

    expect(mockGenerateContentStream).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          systemInstruction: expect.stringContaining("resume"),
        }),
      })
    );
  });
});
