import { vi } from "vitest";
import { buildApp } from "../app.js";

async function* mockStream(chunks: string[]) {
  for (const text of chunks) {
    yield text;
  }
}

describe("health", () => {
  it("returns ok", async () => {
    const app = buildApp();
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
  });
});

describe("GET /session", () => {
  it("creates a new session and returns the greeting when no cookie is present", async () => {
    const app = buildApp();
    await app.ready();

    const response = await app.inject({ method: "GET", url: "/session" });

    expect(response.statusCode).toBe(200);
    expect(response.json().messages).toHaveLength(2);
    expect(response.headers["set-cookie"]).toBeDefined();

    await app.close();
  });

  it("returns existing messages for a valid session", async () => {
    const app = buildApp();
    await app.ready();

    const sessionId = crypto.randomUUID();
    const messages = [
      { role: "assistant" as const, content: "Hi!" },
      { role: "user" as const, content: "Hello" },
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
    const app = buildApp();
    await app.ready();

    const sessionId = crypto.randomUUID();
    await app.sessions.saveSession(sessionId, [{ role: "user" as const, content: "Hello" }]);

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
    const app = buildApp();
    await app.ready();

    const sessionId = crypto.randomUUID();
    await app.sessions.saveSession(sessionId, [{ role: "user" as const, content: "prev" }]);
    vi.spyOn(app.llm, "streamChat").mockReturnValue(mockStream(["Hello", " world"]));
    vi.spyOn(app.llm, "extractName").mockResolvedValue(undefined);

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
    const app = buildApp();
    await app.ready();

    const response = await app.inject({
      method: "POST",
      url: "/chat",
      payload: { message: "Hello" },
    });

    expect(response.statusCode).toBe(400);

    await app.close();
  });
});
