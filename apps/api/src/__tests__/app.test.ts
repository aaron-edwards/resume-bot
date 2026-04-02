import type { GoogleGenAI } from "@google/genai";
import type { ChatMessage } from "@repo/types";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../app";
import { memorySessionStore } from "../lib/sessions/memory";
import { SESSION_COOKIE } from "../routes/consts";

// Mocks
async function* mockStream(chunks: string[]) {
  for (const text of chunks) {
    yield text;
  }
}
const mockExtractName = vi.fn<() => Promise<string | undefined>>().mockResolvedValue(undefined);
const mockStreamChat = vi.fn();
const mockLlm = { extractName: mockExtractName, streamChat: mockStreamChat };
const mockGenai = {
  models: {
    get: vi.fn(),
  },
} as unknown as GoogleGenAI;

// Test setup
let app: FastifyInstance;

beforeEach(async () => {
  memorySessionStore.clear();
  app = buildApp({ llm: mockLlm, genai: mockGenai, sessionStore: memorySessionStore, routePrefix: "" });
  await app.ready();
  mockStreamChat.mockReturnValue(mockStream([]));
  mockExtractName.mockResolvedValue(undefined);
});

afterEach(async () => {
  await app.close();
});

// Tests
describe("GET /health", () => {
  it("returns build and dependency status", async () => {
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty("buildSha");
    expect(body).toHaveProperty("buildTimestamp");
    expect(typeof body.buildTimestamp).toBe("string");
    expect(body).toHaveProperty("dependencies");
    expect(typeof body.buildSha).toBe("string");
    expect(typeof body.dependencies).toBe("object");
  });
});

describe("GET /session", () => {
  it("creates a new session and returns the greeting when no cookie is present", async () => {
    const response = await app.inject({ method: "GET", url: "/session" });
    expect(response.statusCode).toBe(200);
    expect(response.json().messages).toHaveLength(2); // greeting + example
    expect(response.headers["set-cookie"]).toBeDefined();
  });

  it("returns existing messages for a valid session", async () => {
    const sessionId = crypto.randomUUID();
    const messages: ChatMessage[] = [{ role: "user", content: "Hello" }];
    await memorySessionStore.saveSession(sessionId, messages);

    const response = await app.inject({
      method: "GET",
      url: "/session",
      headers: { cookie: `${SESSION_COOKIE}=${sessionId}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().messages).toEqual(messages);
  });
});

describe("POST /session/reset", () => {
  it("clears the session and returns the greeting", async () => {
    const sessionId = crypto.randomUUID();
    await memorySessionStore.saveSession(sessionId, [{ role: "user", content: "Hello" }]);

    const response = await app.inject({
      method: "POST",
      url: "/session/reset",
      headers: { cookie: `${SESSION_COOKIE}=${sessionId}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().messages).toHaveLength(2);
    expect(response.headers["set-cookie"]).toBeDefined();
  });
});

describe("POST /chat", () => {
  it("streams a response for a valid session", async () => {
    mockStreamChat.mockReturnValue(mockStream(["Hello", " world"]));
    const sessionId = crypto.randomUUID();
    await memorySessionStore.saveSession(sessionId, []);

    const response = await app.inject({
      method: "POST",
      url: "/chat",
      headers: { cookie: `${SESSION_COOKIE}=${sessionId}` },
      payload: { message: "Hi" },
    });

    expect(response.statusCode).toBe(200);
    const events = response.body.split("\n\n").filter(Boolean);
    expect(events).toEqual(['data: {"text":"Hello"}', 'data: {"text":" world"}', "data: [DONE]"]);
  });

  it("returns 400 when no session cookie is present", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/chat",
      payload: { message: "Hello" },
    });
    expect(response.statusCode).toBe(400);
  });

  it("returns 400 for missing message body", async () => {
    const response = await app.inject({ method: "POST", url: "/chat", payload: {} });
    expect(response.statusCode).toBe(400);
  });

  it("returns 400 when message exceeds 1000 characters", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/chat",
      payload: { message: "a".repeat(1001) },
    });
    expect(response.statusCode).toBe(400);
  });
});
