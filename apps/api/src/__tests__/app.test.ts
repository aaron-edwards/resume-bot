import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import type { ChatMessage } from "@repo/types";
import Fastify from "fastify";
import fp from "fastify-plugin";
import { vi } from "vitest";
import sessionsPlugin from "../plugins/sessions/index.js";
import { chatRoutes, sessionRoutes } from "../routes/index.js";

function buildTestApp(llm = makeDefaultLlm()) {
  const app = Fastify({ logger: false });

  app.register(
    fp(async (fastify) => {
      fastify.decorate("llm", llm);
    })
  );
  app.register(sessionsPlugin);
  app.register(cors, { origin: "*", credentials: true });
  app.register(cookie);
  app.get("/health", async () => ({ status: "ok" }));
  app.register(sessionRoutes);
  app.register(chatRoutes);

  return app;
}

function makeDefaultLlm() {
  return {
    extractName: vi.fn<() => Promise<string | undefined>>().mockResolvedValue(undefined),
    streamChat: vi.fn().mockReturnValue(mockStream([])),
  };
}

async function* mockStream(chunks: string[]) {
  for (const text of chunks) {
    yield text;
  }
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /health", () => {
  it("returns ok", async () => {
    const app = buildTestApp();
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
  });
});

describe("GET /session", () => {
  it("creates a new session and returns the greeting when no cookie is present", async () => {
    const app = buildTestApp();
    await app.ready();

    const response = await app.inject({ method: "GET", url: "/session" });

    expect(response.statusCode).toBe(200);
    expect(response.json().messages).toHaveLength(2);
    expect(response.headers["set-cookie"]).toBeDefined();

    await app.close();
  });

  it("returns existing messages for a valid session", async () => {
    const app = buildTestApp();
    await app.ready();

    const sessionId = crypto.randomUUID();
    const messages: ChatMessage[] = [
      { role: "assistant", content: "Hi!" },
      { role: "user", content: "Hello" },
    ];
    await app.sessions.saveSession(sessionId, messages);

    const response = await app.inject({
      method: "GET",
      url: "/session",
      headers: { cookie: `session-id=${sessionId}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().messages).toEqual(messages);

    await app.close();
  });
});

describe("POST /session/reset", () => {
  it("clears the session and returns the greeting", async () => {
    const app = buildTestApp();
    await app.ready();

    const sessionId = crypto.randomUUID();
    await app.sessions.saveSession(sessionId, [{ role: "user", content: "Hello" }]);

    const response = await app.inject({
      method: "POST",
      url: "/session/reset",
      headers: { cookie: `session-id=${sessionId}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().messages).toHaveLength(2);
    expect(response.headers["set-cookie"]).toBeDefined();

    await app.close();
  });
});

describe("POST /chat", () => {
  it("streams a response for a valid session", async () => {
    const llm = makeDefaultLlm();
    vi.mocked(llm.streamChat).mockReturnValue(mockStream(["Hello", " world"]));
    const app = buildTestApp(llm);
    await app.ready();

    const sessionId = crypto.randomUUID();
    await app.sessions.saveSession(sessionId, [{ role: "user", content: "prev" }]);

    const response = await app.inject({
      method: "POST",
      url: "/chat",
      headers: { cookie: `session-id=${sessionId}` },
      payload: { message: "Hi" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toBe("text/event-stream");

    const events = response.body.split("\n\n").filter(Boolean);
    expect(events).toEqual(['data: {"text":"Hello"}', 'data: {"text":" world"}', "data: [DONE]"]);

    await app.close();
  });

  it("returns 400 when no session cookie is present", async () => {
    const app = buildTestApp();
    await app.ready();

    const response = await app.inject({
      method: "POST",
      url: "/chat",
      payload: { message: "Hello" },
    });

    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it("returns 400 for missing message body", async () => {
    const app = buildTestApp();
    await app.ready();

    const response = await app.inject({ method: "POST", url: "/chat", payload: {} });

    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it("returns 400 when message exceeds 1000 characters", async () => {
    const app = buildTestApp();
    await app.ready();

    const response = await app.inject({
      method: "POST",
      url: "/chat",
      payload: { message: "a".repeat(1001) },
    });

    expect(response.statusCode).toBe(400);
    await app.close();
  });
});
