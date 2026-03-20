import { vi } from "vitest";
import { buildApp } from "../../app.js";
import { streamChat } from "../../lib/gemini.js";
import { sessionStore } from "../../lib/sessions/index.js";

vi.mock("../../lib/gemini.js", () => ({
  streamChat: vi.fn(),
}));

vi.mock("../../lib/sessions/index.js", () => ({
  sessionStore: {
    getSession: vi.fn().mockResolvedValue([]),
    saveSession: vi.fn().mockResolvedValue(undefined),
  },
}));

async function* mockStream(chunks: string[]) {
  for (const text of chunks) {
    yield text;
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

const SESSION_COOKIE = "session-id=test-session";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /session", () => {
  it("returns existing messages when a valid session cookie is present", async () => {
    const messages = [
      { role: "user" as const, content: "Hello" },
      { role: "assistant" as const, content: "Hi!" },
    ];
    vi.mocked(sessionStore.getSession).mockResolvedValue(messages);

    const app = buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/session",
      headers: { cookie: SESSION_COOKIE },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ messages });
  });

  it("initialises a new session with the greeting when no session cookie is present", async () => {
    const app = buildApp();
    const response = await app.inject({ method: "GET", url: "/session" });

    expect(response.statusCode).toBe(200);
    const { messages } = response.json();
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({ role: "assistant" });
    expect(vi.mocked(sessionStore.saveSession)).toHaveBeenCalled();
    expect(response.headers["set-cookie"]).toContain("session-id=");
  });

  it("initialises a new session when the session cookie points to an empty session", async () => {
    vi.mocked(sessionStore.getSession).mockResolvedValue([]);

    const app = buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/session",
      headers: { cookie: SESSION_COOKIE },
    });

    const { messages } = response.json();
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({ role: "assistant" });
    expect(response.headers["set-cookie"]).toContain("session-id=");
  });
});

describe("POST /session/reset", () => {
  it("creates a new session, sets a new cookie, and returns the greeting", async () => {
    const app = buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/session/reset",
      headers: { cookie: SESSION_COOKIE },
    });

    expect(response.statusCode).toBe(200);
    const { messages } = response.json();
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({ role: "assistant" });
    expect(vi.mocked(sessionStore.saveSession)).toHaveBeenCalled();
    expect(response.headers["set-cookie"]).toContain("session-id=");
  });
});

describe("POST /chat", () => {
  it("streams chunks as SSE events and ends with [DONE]", async () => {
    mockResolved(["Hello", " world"]);
    vi.mocked(sessionStore.getSession).mockResolvedValue([{ role: "user" as const, content: "prev" }]);

    const app = buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/chat",
      headers: { cookie: SESSION_COOKIE },
      payload: { message: "Tell me about yourself" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toBe("text/event-stream");
    const events = parseSseEvents(response.body);
    expect(events).toEqual(['{"text":"Hello"}', '{"text":" world"}', "[DONE]"]);
  });

  it("appends message to history loaded from session store", async () => {
    mockResolved([]);
    vi.mocked(sessionStore.getSession).mockResolvedValue([
      { role: "user" as const, content: "Hello" },
      { role: "assistant" as const, content: "Hi there!" },
    ]);

    const app = buildApp();
    await app.inject({
      method: "POST",
      url: "/chat",
      headers: { cookie: SESSION_COOKIE },
      payload: { message: "How are you?" },
    });

    expect(vi.mocked(streamChat)).toHaveBeenCalledWith([
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi there!" },
      { role: "user", content: "How are you?" },
    ]);
  });

  it("limits history to the last 10 messages", async () => {
    mockResolved([]);
    const longHistory = Array.from({ length: 12 }, (_, i) => ({
      role: i % 2 === 0 ? ("user" as const) : ("assistant" as const),
      content: `message ${i}`,
    }));
    vi.mocked(sessionStore.getSession).mockResolvedValue(longHistory);

    const app = buildApp();
    await app.inject({
      method: "POST",
      url: "/chat",
      headers: { cookie: SESSION_COOKIE },
      payload: { message: "new message" },
    });

    const calledWith = vi.mocked(streamChat).mock.calls[0]?.[0];
    expect(calledWith).toHaveLength(11);
    expect(calledWith?.[0]).toEqual(longHistory[2]);
  });

  it("saves the full conversation after streaming completes", async () => {
    mockResolved(["Hello", " world"]);
    vi.mocked(sessionStore.getSession).mockResolvedValue([
      { role: "user" as const, content: "previous" },
      { role: "assistant" as const, content: "response" },
    ]);

    const app = buildApp();
    await app.inject({
      method: "POST",
      url: "/chat",
      headers: { cookie: SESSION_COOKIE },
      payload: { message: "new message" },
    });

    expect(vi.mocked(sessionStore.saveSession)).toHaveBeenCalledWith(
      "test-session",
      expect.any(String),
      [
        { role: "user", content: "previous" },
        { role: "assistant", content: "response" },
        { role: "user", content: "new message" },
        { role: "assistant", content: "Hello world" },
      ]
    );
  });

  it("proceeds without history when no session cookie is present", async () => {
    mockResolved([]);

    const app = buildApp();
    await app.inject({
      method: "POST",
      url: "/chat",
      payload: { message: "Hello" },
    });

    expect(vi.mocked(sessionStore.getSession)).not.toHaveBeenCalled();
    expect(vi.mocked(sessionStore.saveSession)).not.toHaveBeenCalled();
  });

  describe("errors", () => {
    it("sends error event when stream fails", async () => {
      // biome-ignore lint/correctness/useYield: generator throws before reaching any yield
      vi.mocked(streamChat).mockImplementation(async function* () {
        throw new Error("API unavailable");
      });

      const app = buildApp();
      const response = await app.inject({
        method: "POST",
        url: "/chat",
        headers: { cookie: SESSION_COOKIE },
        payload: { message: "Hello" },
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
