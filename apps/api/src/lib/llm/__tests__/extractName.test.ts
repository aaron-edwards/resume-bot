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
  it("returns found name when model responds with one", async () => {
    mockGenerateContent.mockResolvedValue({ text: '{"found":true,"name":"Alex"}' });

    const result = await llm.extractName([{ role: "user", content: "Hi, I'm Alex" }]);
    expect(result).toEqual({ found: true, name: "Alex" });
  });

  it("returns found false when model finds no name", async () => {
    mockGenerateContent.mockResolvedValue({ text: '{"found":false}' });

    const result = await llm.extractName([{ role: "user", content: "Tell me about Aaron" }]);
    expect(result).toEqual({ found: false });
  });

  it("returns found false when model response contains no JSON", async () => {
    mockGenerateContent.mockResolvedValue({ text: "I cannot determine that." });

    const result = await llm.extractName([{ role: "user", content: "Hi" }]);
    expect(result).toEqual({ found: false });
  });

  it("returns found false when the API call throws", async () => {
    mockGenerateContent.mockRejectedValue(new Error("API error"));

    const result = await llm.extractName([{ role: "user", content: "Hi" }]);
    expect(result).toEqual({ found: false });
  });

  it("maps assistant role to model in contents", async () => {
    mockGenerateContent.mockResolvedValue({ text: '{"found":false}' });

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
