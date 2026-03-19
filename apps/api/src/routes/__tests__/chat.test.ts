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
      payload: { message: "Tell me about yourself" },
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
      payload: { message: "Tell me about yourself" },
    });

    const events = parseSseEvents(response.body);
    expect(events).toEqual(['{"text":"Hello"}', '{"text":"world"}', "[DONE]"]);
  });

  describe("errors", () => {
    it("sends error event when stream fails", async () => {
      vi.mocked(streamChat).mockRejectedValue(new Error("API unavailable"));

      const app = buildApp();
      const response = await app.inject({
        method: "POST",
        url: "/chat",
        payload: { message: "Tell me about yourself" },
      });

      const events = parseSseEvents(response.body);
      expect(events).toEqual(['{"error":"API unavailable"}']);
    });

    it("returns 400 for missing message", async () => {
      const app = buildApp();
      const response = await app.inject({
        method: "POST",
        url: "/chat",
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it("returns 400 for empty message", async () => {
      const app = buildApp();
      const response = await app.inject({
        method: "POST",
        url: "/chat",
        payload: { message: "" },
      });

      expect(response.statusCode).toBe(400);
    });

    it("returns 400 when message exceeds 1000 characters", async () => {
      const app = buildApp();
      const response = await app.inject({
        method: "POST",
        url: "/chat",
        payload: { message: "a".repeat(1001) },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
