import type { ChatRequest } from "@repo/types";

type SseParsed = { text?: string; error?: string };

function parseSseLine(line: string): SseParsed | "[DONE]" | null {
  if (!line.startsWith("data: ")) return null;
  const data = line.slice(6);
  if (data === "[DONE]") return "[DONE]";
  return JSON.parse(data) as SseParsed;
}

export async function* streamChatResponse(message: string, sessionId: string): AsyncGenerator<string> {
  const body: ChatRequest = { message, sessionId };

  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
  const response = await fetch(`${apiUrl}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error("You're sending messages too fast. Please wait a moment and try again.");
    throw new Error(`Something went wrong (${response.status}). Please try again.`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  if (!reader) return;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    for (const line of decoder.decode(value).split("\n")) {
      const parsed = parseSseLine(line);
      if (!parsed) continue;
      if (parsed === "[DONE]") return;
      if (parsed.error) throw new Error(parsed.error);
      if (parsed.text) yield parsed.text;
    }
  }
}
