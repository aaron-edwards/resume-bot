import { vi } from "vitest";
import { buildApp } from "../../app.js";
import { streamChat } from "../../lib/gemini.js";

vi.mock("../../lib/gemini.js", () => ({
  streamChat: vi.fn(),
}));

async function* mockStream(chunks: string[]) {
  for (const text of chunks) {
    yield { text };
  }
}

const mockResolved = (chunks: string[]) =>
  vi.mocked(streamChat).mockReturnValue(mockStream(chunks));

function parseSseEvents(body: string) {
  return body
    .split("\n\n")
    .filter(Boolean)
    .map((line) => line.replace(/^data: /, ""));
}

const validPayload = {
  messages: [{ role: "user", content: "Tell me about yourself" }],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /chat", () => {
  it("streams chunks as SSE events and ends with [DONE]", async () => {
    mockResolved(["Hello", " world"]);

    const app = buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/chat",
      payload: validPayload,
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toBe("text/event-stream");

    const events = parseSseEvents(response.body);
    expect(events).toEqual(['{"text":"Hello"}', '{"text":" world"}', "[DONE]"]);
  });

  it("skips empty chunks", async () => {
    mockResolved(["Hello", "", "world"]);

    const app = buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/chat",
      payload: validPayload,
    });

    const events = parseSseEvents(response.body);
    expect(events).toEqual(['{"text":"Hello"}', '{"text":"world"}', "[DONE]"]);
  });

  it("passes full message history to streamChat", async () => {
    mockResolved([]);

    const app = buildApp();
    await app.inject({
      method: "POST",
      url: "/chat",
      payload: {
        messages: [
          { role: "user", content: "Hello" },
          { role: "assistant", content: "Hi there!" },
          { role: "user", content: "How are you?" },
        ],
      },
    });

    expect(vi.mocked(streamChat)).toHaveBeenCalledWith([
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi there!" },
      { role: "user", content: "How are you?" },
    ]);
  });

  describe("errors", () => {
    it("sends error event when stream fails", async () => {
      vi.mocked(streamChat).mockImplementation(async function* () {
        throw new Error("API unavailable");
      });

      const app = buildApp();
      const response = await app.inject({
        method: "POST",
        url: "/chat",
        payload: validPayload,
      });

      const events = parseSseEvents(response.body);
      expect(events).toEqual(['{"error":"API unavailable"}']);
    });

    it("returns 400 for missing messages", async () => {
      const app = buildApp();
      const response = await app.inject({
        method: "POST",
        url: "/chat",
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it("returns 400 for empty messages array", async () => {
      const app = buildApp();
      const response = await app.inject({
        method: "POST",
        url: "/chat",
        payload: { messages: [] },
      });

      expect(response.statusCode).toBe(400);
    });

    it("returns 400 when content exceeds 1000 characters", async () => {
      const app = buildApp();
      const response = await app.inject({
        method: "POST",
        url: "/chat",
        payload: { messages: [{ role: "user", content: "a".repeat(1001) }] },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
