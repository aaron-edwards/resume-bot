import { vi } from "vitest";
import { buildApp } from "../../app.js";
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
    vi.mocked(sessionStore.getSession).mockResolvedValue({ messages, userName: undefined });

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
    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({ role: "assistant" });
    expect(vi.mocked(sessionStore.saveSession)).toHaveBeenCalled();
    expect(response.headers["set-cookie"]).toContain("session-id=");
  });

  it("initialises a new session when the session cookie points to an empty session", async () => {
    vi.mocked(sessionStore.getSession).mockResolvedValue({ messages: [], userName: undefined });

    const app = buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/session",
      headers: { cookie: SESSION_COOKIE },
    });

    const { messages } = response.json();
    expect(messages).toHaveLength(2);
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
    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({ role: "assistant" });
    expect(vi.mocked(sessionStore.saveSession)).toHaveBeenCalled();
    expect(response.headers["set-cookie"]).toContain("session-id=");
  });

  it("issues a new session ID even when a valid session cookie is present", async () => {
    const app = buildApp();
    await app.inject({
      method: "POST",
      url: "/session/reset",
      headers: { cookie: SESSION_COOKIE },
    });

    const savedId = vi.mocked(sessionStore.saveSession).mock.calls[0]?.[0];
    expect(savedId).not.toBe("test-session");
  });
});
