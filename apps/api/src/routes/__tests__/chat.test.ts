import { vi } from "vitest";
import { buildApp } from "../../app.js";
import { llm } from "../../lib/llm/index.js";
import { sessionStore } from "../../lib/sessions/index.js";

vi.mock("../../lib/llm/index.js", () => ({
  llm: {
    streamChat: vi.fn(),
    extractName: vi.fn().mockResolvedValue({ found: false }),
  },
}));

vi.mock("../../lib/sessions/index.js", () => ({
  sessionStore: {
    getSession: vi.fn().mockResolvedValue({ messages: [], userName: undefined }),
    saveSession: vi.fn().mockResolvedValue(undefined),
  },
}));

async function* mockStream(chunks: string[]) {
  for (const text of chunks) {
    yield text;
  }
}

const mockResolved = (chunks: string[]) =>
  vi.mocked(llm.streamChat).mockReturnValue(mockStream(chunks));

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

describe("POST /chat", () => {
  it("streams chunks as SSE events and ends with [DONE]", async () => {
    mockResolved(["Hello", " world"]);
    vi.mocked(sessionStore.getSession).mockResolvedValue({
      messages: [{ role: "user" as const, content: "prev" }],
      userName: undefined,
    });

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
    vi.mocked(sessionStore.getSession).mockResolvedValue({
      messages: [
        { role: "user" as const, content: "Hello" },
        { role: "assistant" as const, content: "Hi there!" },
      ],
      userName: undefined,
    });

    const app = buildApp();
    await app.inject({
      method: "POST",
      url: "/chat",
      headers: { cookie: SESSION_COOKIE },
      payload: { message: "How are you?" },
    });

    expect(vi.mocked(llm.streamChat)).toHaveBeenCalledWith(
      [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi there!" },
        { role: "user", content: "How are you?" },
      ],
      undefined
    );
  });

  it("passes full history plus new message to streamChat", async () => {
    mockResolved([]);
    const history = Array.from({ length: 4 }, (_, i) => ({
      role: i % 2 === 0 ? ("user" as const) : ("assistant" as const),
      content: `message ${i}`,
    }));
    vi.mocked(sessionStore.getSession).mockResolvedValue({
      messages: history,
      userName: undefined,
    });

    const app = buildApp();
    await app.inject({
      method: "POST",
      url: "/chat",
      headers: { cookie: SESSION_COOKIE },
      payload: { message: "new message" },
    });

    const calledWith = vi.mocked(llm.streamChat).mock.calls[0]?.[0];
    expect(calledWith).toHaveLength(5);
    expect(calledWith?.[4]).toEqual({ role: "user", content: "new message" });
  });

  it("saves the full conversation after streaming completes", async () => {
    mockResolved(["Hello", " world"]);
    vi.mocked(sessionStore.getSession).mockResolvedValue({
      messages: [
        { role: "user" as const, content: "previous" },
        { role: "assistant" as const, content: "response" },
      ],
      userName: undefined,
    });

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
      ],
      undefined
    );
  });

  it("returns 400 when no session cookie is present", async () => {
    const app = buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/chat",
      payload: { message: "Hello" },
    });

    expect(response.statusCode).toBe(400);
    expect(vi.mocked(sessionStore.getSession)).not.toHaveBeenCalled();
  });

  describe("name extraction", () => {
    it("calls extractName on the first user message", async () => {
      mockResolved([]);
      vi.mocked(sessionStore.getSession).mockResolvedValue({
        messages: [{ role: "assistant" as const, content: "Hi!" }],
        userName: undefined,
      });

      const app = buildApp();
      await app.inject({
        method: "POST",
        url: "/chat",
        headers: { cookie: SESSION_COOKIE },
        payload: { message: "I'm Alex" },
      });

      expect(vi.mocked(llm.extractName)).toHaveBeenCalledWith([
        { role: "assistant", content: "Hi!" },
        { role: "user", content: "I'm Alex" },
      ]);
    });

    it("saves userName and passes it to streamChat when a name is found", async () => {
      mockResolved(["Hi Alex!"]);
      vi.mocked(sessionStore.getSession).mockResolvedValue({
        messages: [{ role: "assistant" as const, content: "Hi!" }],
        userName: undefined,
      });
      vi.mocked(llm.extractName).mockResolvedValue({ found: true, name: "Alex" });

      const app = buildApp();
      await app.inject({
        method: "POST",
        url: "/chat",
        headers: { cookie: SESSION_COOKIE },
        payload: { message: "I'm Alex" },
      });

      expect(vi.mocked(sessionStore.saveSession)).toHaveBeenCalledWith(
        "test-session",
        expect.any(String),
        [
          { role: "assistant", content: "Hi!" },
          { role: "user", content: "I'm Alex" },
        ],
        "Alex"
      );
      expect(vi.mocked(llm.streamChat)).toHaveBeenCalledWith(expect.any(Array), "Alex");
    });

    it("does not call extractName on subsequent messages", async () => {
      mockResolved([]);
      vi.mocked(sessionStore.getSession).mockResolvedValue({
        messages: [
          { role: "assistant" as const, content: "Hi!" },
          { role: "user" as const, content: "I'm Alex" },
        ],
        userName: "Alex",
      });

      const app = buildApp();
      await app.inject({
        method: "POST",
        url: "/chat",
        headers: { cookie: SESSION_COOKIE },
        payload: { message: "Tell me about Aaron" },
      });

      expect(vi.mocked(llm.extractName)).not.toHaveBeenCalled();
    });

    it("passes existing userName to streamChat on subsequent messages", async () => {
      mockResolved([]);
      vi.mocked(sessionStore.getSession).mockResolvedValue({
        messages: [
          { role: "assistant" as const, content: "Hi!" },
          { role: "user" as const, content: "I'm Alex" },
        ],
        userName: "Alex",
      });

      const app = buildApp();
      await app.inject({
        method: "POST",
        url: "/chat",
        headers: { cookie: SESSION_COOKIE },
        payload: { message: "Tell me about Aaron" },
      });

      expect(vi.mocked(llm.streamChat)).toHaveBeenCalledWith(expect.any(Array), "Alex");
    });

    it("skips saving userName when no name is found", async () => {
      mockResolved([]);
      vi.mocked(sessionStore.getSession).mockResolvedValue({
        messages: [{ role: "assistant" as const, content: "Hi!" }],
        userName: undefined,
      });
      vi.mocked(llm.extractName).mockResolvedValue({ found: false });

      const app = buildApp();
      await app.inject({
        method: "POST",
        url: "/chat",
        headers: { cookie: SESSION_COOKIE },
        payload: { message: "I'd rather not say" },
      });

      const saveCalls = vi.mocked(sessionStore.saveSession).mock.calls;
      const userNameSaveCall = saveCalls.find((call) => call[3] !== undefined);
      expect(userNameSaveCall).toBeUndefined();
    });
  });

  describe("errors", () => {
    it("sends error event when stream fails", async () => {
      // biome-ignore lint/correctness/useYield: generator throws before reaching any yield
      vi.mocked(llm.streamChat).mockImplementation(async function* () {
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
