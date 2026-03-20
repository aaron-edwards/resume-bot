import { beforeEach, describe, expect, it } from "vitest";

// Re-import the module fresh for each test to reset the in-memory store
let memorySessionStore: typeof import("../memory.js")["memorySessionStore"];

beforeEach(async () => {
  vi.resetModules();
  ({ memorySessionStore } = await import("../memory.js"));
});

describe("memorySessionStore", () => {
  it("returns empty messages and no userName for unknown session", async () => {
    expect(await memorySessionStore.getSession("unknown")).toEqual({
      messages: [],
      userName: undefined,
    });
  });

  it("saves and retrieves messages", async () => {
    const messages = [
      { role: "user" as const, content: "Hello" },
      { role: "assistant" as const, content: "Hi there!" },
    ];

    await memorySessionStore.saveSession("session-1", "127.0.0.1", messages);
    expect(await memorySessionStore.getSession("session-1")).toEqual({
      messages,
      userName: undefined,
    });
  });

  it("updates messages on subsequent saves", async () => {
    const initial = [{ role: "user" as const, content: "Hello" }];
    const updated = [
      { role: "user" as const, content: "Hello" },
      { role: "assistant" as const, content: "Hi!" },
    ];

    await memorySessionStore.saveSession("session-1", "127.0.0.1", initial);
    await memorySessionStore.saveSession("session-1", "127.0.0.1", updated);

    expect(await memorySessionStore.getSession("session-1")).toEqual({
      messages: updated,
      userName: undefined,
    });
  });

  it("saves and retrieves userName", async () => {
    const messages = [{ role: "user" as const, content: "I'm Alex" }];
    await memorySessionStore.saveSession("session-1", "127.0.0.1", messages, "Alex");
    expect(await memorySessionStore.getSession("session-1")).toEqual({
      messages,
      userName: "Alex",
    });
  });

  it("preserves userName on update when not provided", async () => {
    const messages = [{ role: "user" as const, content: "I'm Alex" }];
    await memorySessionStore.saveSession("session-1", "127.0.0.1", messages, "Alex");
    const updated = [...messages, { role: "assistant" as const, content: "Hi Alex!" }];
    await memorySessionStore.saveSession("session-1", "127.0.0.1", updated);
    expect(await memorySessionStore.getSession("session-1")).toEqual({
      messages: updated,
      userName: "Alex",
    });
  });

  it("isolates sessions from each other", async () => {
    await memorySessionStore.saveSession("session-1", "1.1.1.1", [
      { role: "user" as const, content: "A" },
    ]);
    await memorySessionStore.saveSession("session-2", "2.2.2.2", [
      { role: "user" as const, content: "B" },
    ]);

    expect(await memorySessionStore.getSession("session-1")).toEqual({
      messages: [{ role: "user", content: "A" }],
      userName: undefined,
    });
    expect(await memorySessionStore.getSession("session-2")).toEqual({
      messages: [{ role: "user", content: "B" }],
      userName: undefined,
    });
  });
});
