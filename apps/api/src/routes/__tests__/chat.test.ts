import type { ChatMessage } from "@repo/types";
import { vi } from "vitest";
import { handleChat } from "../chat";

async function* mockStream(chunks: string[]) {
  for (const text of chunks) {
    yield text;
  }
}

function makeRequest(message: string, ip = "127.0.0.1") {
  return { body: { message }, ip };
}

function makeSessions(messages: ChatMessage[] = [], userName?: string) {
  return {
    getSession: vi.fn().mockResolvedValue({ messages, userName }),
    saveSession: vi.fn().mockResolvedValue(undefined),
  };
}

function makeLlm() {
  return {
    extractName: vi.fn<() => Promise<string | undefined>>().mockResolvedValue(undefined),
    streamChat: vi.fn().mockReturnValue(mockStream([])),
  };
}

function makeLog() {
  return { info: vi.fn(), error: vi.fn() };
}

function makeWrite() {
  return vi.fn<(data: string) => void>();
}

function getSseEvents(write: ReturnType<typeof makeWrite>) {
  return write.mock.calls.map((call) => call[0].replace(/^data: /, "").trim()).filter(Boolean);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("handleChat", () => {
  it("writes SSE chunks and ends with [DONE]", async () => {
    const sessions = makeSessions([{ role: "user", content: "prev" }]);
    const llm = makeLlm();
    vi.mocked(llm.streamChat).mockReturnValue(mockStream(["Hello", " world"]));
    const write = makeWrite();

    await handleChat(makeRequest("Hi"), "test-session", write, sessions, llm, makeLog());

    expect(getSseEvents(write)).toEqual(['{"text":"Hello"}', '{"text":" world"}', "[DONE]"]);
  });

  it("appends the new message to history before calling streamChat", async () => {
    const history: ChatMessage[] = [
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi!" },
    ];
    const llm = makeLlm();

    await handleChat(
      makeRequest("How are you?"),
      "test-session",
      makeWrite(),
      makeSessions(history),
      llm,
      makeLog()
    );

    expect(vi.mocked(llm.streamChat)).toHaveBeenCalledWith(
      [...history, { role: "user", content: "How are you?" }],
      undefined
    );
  });

  it("saves the full conversation after streaming completes", async () => {
    const history: ChatMessage[] = [
      { role: "user", content: "previous" },
      { role: "assistant", content: "response" },
    ];
    const sessions = makeSessions(history);
    const llm = makeLlm();
    vi.mocked(llm.streamChat).mockReturnValue(mockStream(["Hello", " world"]));

    await handleChat(
      makeRequest("new message"),
      "test-session",
      makeWrite(),
      sessions,
      llm,
      makeLog()
    );

    expect(vi.mocked(sessions.saveSession)).toHaveBeenCalledWith(
      "test-session",
      [
        { role: "user", content: "previous" },
        { role: "assistant", content: "response" },
        { role: "user", content: "new message" },
        { role: "assistant", content: "Hello world" },
      ],
      undefined
    );
  });

  describe("name extraction", () => {
    it("calls extractName on the first user message", async () => {
      const llm = makeLlm();

      await handleChat(
        makeRequest("I'm Alex"),
        "test-session",
        makeWrite(),
        makeSessions([{ role: "assistant", content: "Hi!" }]),
        llm,
        makeLog()
      );

      expect(vi.mocked(llm.extractName)).toHaveBeenCalledWith([
        { role: "assistant", content: "Hi!" },
        { role: "user", content: "I'm Alex" },
      ]);
    });

    it("saves userName and passes it to streamChat when a name is found", async () => {
      const sessions = makeSessions([{ role: "assistant", content: "Hi!" }]);
      const llm = makeLlm();
      vi.mocked(llm.extractName).mockResolvedValue("Alex");
      vi.mocked(llm.streamChat).mockReturnValue(mockStream(["Hi Alex!"]));

      await handleChat(
        makeRequest("I'm Alex"),
        "test-session",
        makeWrite(),
        sessions,
        llm,
        makeLog()
      );

      expect(vi.mocked(sessions.saveSession)).toHaveBeenCalledWith(
        "test-session",
        [
          { role: "assistant", content: "Hi!" },
          { role: "user", content: "I'm Alex" },
        ],
        "Alex",
        "127.0.0.1"
      );
      expect(vi.mocked(llm.streamChat)).toHaveBeenCalledWith(expect.any(Array), "Alex");
    });

    it("does not call extractName on subsequent messages", async () => {
      const history: ChatMessage[] = [
        { role: "assistant", content: "Hi!" },
        { role: "user", content: "I'm Alex" },
      ];
      const llm = makeLlm();

      await handleChat(
        makeRequest("Tell me about Aaron"),
        "test-session",
        makeWrite(),
        makeSessions(history, "Alex"),
        llm,
        makeLog()
      );

      expect(vi.mocked(llm.extractName)).not.toHaveBeenCalled();
    });

    it("passes existing userName to streamChat on subsequent messages", async () => {
      const history: ChatMessage[] = [
        { role: "assistant", content: "Hi!" },
        { role: "user", content: "I'm Alex" },
      ];
      const llm = makeLlm();

      await handleChat(
        makeRequest("Tell me about Aaron"),
        "test-session",
        makeWrite(),
        makeSessions(history, "Alex"),
        llm,
        makeLog()
      );

      expect(vi.mocked(llm.streamChat)).toHaveBeenCalledWith(expect.any(Array), "Alex");
    });

    it("skips saving userName when no name is found", async () => {
      const sessions = makeSessions([{ role: "assistant", content: "Hi!" }]);
      const llm = makeLlm();
      vi.mocked(llm.extractName).mockResolvedValue(undefined);

      await handleChat(
        makeRequest("no name"),
        "test-session",
        makeWrite(),
        sessions,
        llm,
        makeLog()
      );

      const saveCalls = vi.mocked(sessions.saveSession).mock.calls;
      expect(saveCalls.find((call) => call[2] !== undefined)).toBeUndefined();
    });
  });

  describe("errors", () => {
    it("writes an error SSE event when the stream fails", async () => {
      const llm = makeLlm();
      // biome-ignore lint/correctness/useYield: generator throws before reaching any yield
      vi.mocked(llm.streamChat).mockImplementation(async function* () {
        throw new Error("API unavailable");
      });
      const write = makeWrite();

      await handleChat(
        makeRequest("Hi"),
        "test-session",
        write,
        makeSessions([{ role: "user", content: "prev" }]),
        llm,
        makeLog()
      );

      expect(getSseEvents(write)).toEqual(['{"error":"API unavailable"}']);
    });
  });
});
