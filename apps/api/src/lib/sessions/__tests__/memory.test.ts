import { beforeEach, describe, expect, it } from "vitest";

// Re-import the module fresh for each test to reset the in-memory store
let memorySessionStore: typeof import("../memory.js")["memorySessionStore"];

beforeEach(async () => {
  vi.resetModules();
  ({ memorySessionStore } = await import("../memory.js"));
});

describe("memorySessionStore", () => {
  it("returns empty array for unknown session", async () => {
    expect(await memorySessionStore.getSession("unknown")).toEqual([]);
  });

  it("saves and retrieves messages", async () => {
    const messages = [
      { role: "user" as const, content: "Hello" },
      { role: "assistant" as const, content: "Hi there!" },
    ];

    await memorySessionStore.saveSession("session-1", "127.0.0.1", messages);
    expect(await memorySessionStore.getSession("session-1")).toEqual(messages);
  });

  it("updates messages on subsequent saves", async () => {
    const initial = [{ role: "user" as const, content: "Hello" }];
    const updated = [
      { role: "user" as const, content: "Hello" },
      { role: "assistant" as const, content: "Hi!" },
    ];

    await memorySessionStore.saveSession("session-1", "127.0.0.1", initial);
    await memorySessionStore.saveSession("session-1", "127.0.0.1", updated);

    expect(await memorySessionStore.getSession("session-1")).toEqual(updated);
  });

  it("isolates sessions from each other", async () => {
    await memorySessionStore.saveSession("session-1", "1.1.1.1", [
      { role: "user" as const, content: "A" },
    ]);
    await memorySessionStore.saveSession("session-2", "2.2.2.2", [
      { role: "user" as const, content: "B" },
    ]);

    expect(await memorySessionStore.getSession("session-1")).toEqual([
      { role: "user", content: "A" },
    ]);
    expect(await memorySessionStore.getSession("session-2")).toEqual([
      { role: "user", content: "B" },
    ]);
  });
});
