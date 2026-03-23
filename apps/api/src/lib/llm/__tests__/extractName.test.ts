import type { GoogleGenAI } from "@google/genai";
import { extractName } from "../extractName";

function makeClient(response: { text?: string } | Error) {
  return {
    models: {
      generateContent:
        response instanceof Error
          ? vi.fn().mockRejectedValue(response)
          : vi.fn().mockResolvedValue(response),
    },
  } as unknown as GoogleGenAI;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("extractName", () => {
  it("returns the name when model finds one", async () => {
    const client = makeClient({ text: '{"name":"Alex"}' });

    const result = await extractName(client, [{ role: "user", content: "Hi, I'm Alex" }]);
    expect(result).toBe("Alex");
  });

  it("returns undefined when model finds no name", async () => {
    const client = makeClient({ text: "{}" });

    const result = await extractName(client, [{ role: "user", content: "Tell me about Aaron" }]);
    expect(result).toBeUndefined();
  });

  it("returns undefined when model response contains no JSON", async () => {
    const client = makeClient({ text: "I cannot determine that." });

    const result = await extractName(client, [{ role: "user", content: "Hi" }]);
    expect(result).toBeUndefined();
  });

  it("returns undefined when the API call throws", async () => {
    const client = makeClient(new Error("API error"));

    const result = await extractName(client, [{ role: "user", content: "Hi" }]);
    expect(result).toBeUndefined();
  });

  it("filters out assistant roles", async () => {
    const client = makeClient({ text: "{}" });

    await extractName(client, [
      { role: "assistant", content: "Hello!" },
      { role: "user", content: "I'm Alex" },
    ]);

    expect(client.models.generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        contents: expect.arrayContaining([{ role: "user", parts: [{ text: "I'm Alex" }] }]),
      })
    );
  });
});
