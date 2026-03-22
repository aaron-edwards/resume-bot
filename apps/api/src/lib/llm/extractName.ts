import type { GoogleGenAI } from "@google/genai";
import type { ChatMessage } from "@repo/types";

function buildContents(messages: ChatMessage[]) {
  return [
    ...messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    {
      role: "user",
      parts: [
        {
          text: 'Did the user introduce themselves by name or alter-ego? Return JSON only: { "found": true, "name": "<name>" } or { "found": false }. If the user did not provide their own name, return { "found": false }.',
        },
      ],
    },
  ];
}

export function makeExtractName(client: GoogleGenAI) {
  return async function extractName(
    messages: ChatMessage[]
  ): Promise<{ found: boolean; name?: string }> {
    try {
      const response = await client.models.generateContent({
        model: "gemini-2.5-flash-lite",
        config: {
          systemInstruction:
            "You extract names from conversations. Only return the name the user introduces as their own identity — ignore any names mentioned in the assistant's messages. Return JSON only — no markdown, no explanation.",
        },
        contents: buildContents(messages),
      });
      const text = response.text ?? "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return { found: false };
      return JSON.parse(jsonMatch[0]) as { found: boolean; name?: string };
    } catch {
      return { found: false };
    }
  };
}
