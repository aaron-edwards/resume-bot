import type { ChatMessage } from "@repo/types";
import { vi } from "vitest";
import { sessionStore } from "../../lib/sessions/index.js";
import { getSession, resetSession } from "../session.js";

vi.mock("../../lib/sessions/index.js", () => ({
  sessionStore: {
    getSession: vi.fn().mockResolvedValue({ messages: [], userName: undefined }),
    saveSession: vi.fn().mockResolvedValue(undefined),
  },
}));

function makeRequest(cookies: Record<string, string> = {}) {
  return { cookies, headers: {}, ip: "127.0.0.1" };
}

function makeReply() {
  return {
    setCookie: vi.fn(),
    send: vi.fn<(data: { messages: ChatMessage[] }) => void>(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getSession", () => {
  it("returns existing messages when a valid session cookie is present", async () => {
    const messages = [
      { role: "user" as const, content: "Hello" },
      { role: "assistant" as const, content: "Hi!" },
    ];
    vi.mocked(sessionStore.getSession).mockResolvedValue({ messages, userName: undefined });

    const reply = makeReply();
    await getSession(makeRequest({ "session-id": "abc" }), reply);

    expect(reply.send).toHaveBeenCalledWith({ messages });
    expect(reply.setCookie).not.toHaveBeenCalled();
  });

  it("initialises a new session with the greeting when no session cookie is present", async () => {
    const reply = makeReply();
    await getSession(makeRequest(), reply);

    const { messages } = reply.send.mock.calls[0]?.[0] ?? { messages: [] };
    expect(messages).toHaveLength(2);
    expect(vi.mocked(sessionStore.saveSession)).toHaveBeenCalled();
    expect(reply.setCookie).toHaveBeenCalledWith(
      "session-id",
      expect.any(String),
      expect.any(Object)
    );
  });

  it("initialises a new session when the session cookie points to an empty session", async () => {
    vi.mocked(sessionStore.getSession).mockResolvedValue({ messages: [], userName: undefined });

    const reply = makeReply();
    await getSession(makeRequest({ "session-id": "abc" }), reply);

    const { messages } = reply.send.mock.calls[0]?.[0] ?? { messages: [] };
    expect(messages).toHaveLength(2);
    expect(reply.setCookie).toHaveBeenCalledWith(
      "session-id",
      expect.any(String),
      expect.any(Object)
    );
  });
});

describe("resetSession", () => {
  it("creates a new session, sets a new cookie, and returns the greeting", async () => {
    const reply = makeReply();
    await resetSession(makeRequest({ "session-id": "abc" }), reply);

    const { messages } = reply.send.mock.calls[0]?.[0] ?? { messages: [] };
    expect(messages).toHaveLength(2);
    expect(vi.mocked(sessionStore.saveSession)).toHaveBeenCalled();
    expect(reply.setCookie).toHaveBeenCalledWith(
      "session-id",
      expect.any(String),
      expect.any(Object)
    );
  });

  it("issues a new session ID even when a valid session cookie is present", async () => {
    const reply = makeReply();
    await resetSession(makeRequest({ "session-id": "old-session" }), reply);

    const savedId = vi.mocked(sessionStore.saveSession).mock.calls[0]?.[0];
    expect(savedId).not.toBe("old-session");
  });
});
