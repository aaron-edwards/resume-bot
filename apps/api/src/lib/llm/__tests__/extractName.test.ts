import { vi } from "vitest";
import { llm } from "../index.js";

const mockGenerateContent = vi.hoisted(() => vi.fn());

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: { generateContent: mockGenerateContent },
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("extractName", () => {
  it("returns the name when model finds one", async () => {
    mockGenerateContent.mockResolvedValue({ text: '{"name":"Alex"}' });

    const result = await llm.extractName([{ role: "user", content: "Hi, I'm Alex" }]);
    expect(result).toBe("Alex");
  });

  it("returns undefined when model finds no name", async () => {
    mockGenerateContent.mockResolvedValue({ text: "{}" });

    const result = await llm.extractName([{ role: "user", content: "Tell me about Aaron" }]);
    expect(result).toBeUndefined();
  });

  it("returns undefined when model response contains no JSON", async () => {
    mockGenerateContent.mockResolvedValue({ text: "I cannot determine that." });

    const result = await llm.extractName([{ role: "user", content: "Hi" }]);
    expect(result).toBeUndefined();
  });

  it("returns undefined when the API call throws", async () => {
    mockGenerateContent.mockRejectedValue(new Error("API error"));

    const result = await llm.extractName([{ role: "user", content: "Hi" }]);
    expect(result).toBeUndefined();
  });

  it("maps assistant role to model in contents", async () => {
    mockGenerateContent.mockResolvedValue({ text: "{}" });

    await llm.extractName([
      { role: "assistant", content: "Hello!" },
      { role: "user", content: "I'm Alex" },
    ]);

    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        contents: expect.arrayContaining([
          { role: "model", parts: [{ text: "Hello!" }] },
          { role: "user", parts: [{ text: "I'm Alex" }] },
        ]),
      })
    );
  });
});
