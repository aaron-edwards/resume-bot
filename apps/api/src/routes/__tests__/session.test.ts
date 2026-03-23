import type { ChatMessage } from "@repo/types";
import { vi } from "vitest";
import type { SessionStore } from "../../lib/sessions/types";
import { SESSION_COOKIE } from "../consts";
import { getSession, resetSession } from "../session";

function makeStore(messages: ChatMessage[] = []): SessionStore {
  return {
    getSession: vi.fn().mockResolvedValue({ messages, userName: undefined }),
    saveSession: vi.fn().mockResolvedValue(undefined),
  };
}

function makeRequest(cookies: Record<string, string> = {}) {
  return { cookies };
}

function makeReply() {
  return {
    setCookie: vi.fn(),
    send: vi.fn<(data: { messages: ChatMessage[] }) => void>(),
  };
}

function makeLog() {
  return { info: vi.fn() };
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
    const store = makeStore(messages);
    const reply = makeReply();

    await getSession(makeRequest({ [SESSION_COOKIE]: "abc" }), reply, store, makeLog());

    expect(reply.send).toHaveBeenCalledWith({ messages });
    expect(reply.setCookie).not.toHaveBeenCalled();
  });

  it("initialises a new session with the greeting when no session cookie is present", async () => {
    const store = makeStore();
    const reply = makeReply();

    await getSession(makeRequest(), reply, store, makeLog());

    const { messages } = reply.send.mock.calls[0]?.[0] ?? { messages: [] };
    expect(messages).toHaveLength(2);
    expect(store.saveSession).toHaveBeenCalled();
    expect(reply.setCookie).toHaveBeenCalledWith(
      SESSION_COOKIE,
      expect.any(String),
      expect.any(Object)
    );
  });

  it("initialises a new session when the session cookie points to an empty session", async () => {
    const store = makeStore();
    const reply = makeReply();

    await getSession(makeRequest({ [SESSION_COOKIE]: "abc" }), reply, store, makeLog());

    const { messages } = reply.send.mock.calls[0]?.[0] ?? { messages: [] };
    expect(messages).toHaveLength(2);
    expect(reply.setCookie).toHaveBeenCalledWith(
      SESSION_COOKIE,
      expect.any(String),
      expect.any(Object)
    );
  });
});

describe("resetSession", () => {
  it("creates a new session, sets a new cookie, and returns the greeting", async () => {
    const store = makeStore();
    const reply = makeReply();

    await resetSession(reply, store, makeLog());

    const { messages } = reply.send.mock.calls[0]?.[0] ?? { messages: [] };
    expect(messages).toHaveLength(2);
    expect(store.saveSession).toHaveBeenCalled();
    expect(reply.setCookie).toHaveBeenCalledWith(
      SESSION_COOKIE,
      expect.any(String),
      expect.any(Object)
    );
  });

  it("always issues a fresh session ID", async () => {
    const store = makeStore();

    await resetSession(makeReply(), store, makeLog());

    const savedId = vi.mocked(store.saveSession).mock.calls[0]?.[0];
    expect(savedId).not.toBe("old-session");
  });
});
