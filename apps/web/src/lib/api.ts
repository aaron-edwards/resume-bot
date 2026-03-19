import type { ChatMessage, ChatRequest } from "@repo/types";

export async function* streamChatResponse(messages: ChatMessage[]): AsyncGenerator<string> {
  const body: ChatRequest = { messages };

  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
  const response = await fetch(`${apiUrl}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  if (!reader) return;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    for (const line of decoder.decode(value).split("\n")) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6);
      if (data === "[DONE]") return;

      const parsed = JSON.parse(data) as { text?: string; error?: string };
      if (parsed.text) yield parsed.text;
    }
  }
}
