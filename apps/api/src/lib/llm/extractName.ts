import type { GoogleGenAI } from "@google/genai";
import type { ChatMessage } from "@repo/types";

function buildContents(messages: ChatMessage[]) {
  return [
    ...messages
      .filter((m) => m.role === "user")
      .map((m) => ({
        role: "user" as const,
        parts: [{ text: m.content }],
      })),
    {
      role: "user" as const,
      parts: [
        {
          text: 'The user was asked "what is your name?" before their first message. Did they provide a name or alter-ego in response? Short responses like "Bob", or initials (eg "AE") count. Return JSON only: { "name": "<name>" } if they did, or {} if they did not.',
        },
      ],
    },
  ];
}

export async function extractName(
  genAiClient: GoogleGenAI,
  messages: ChatMessage[]
): Promise<string | undefined> {
  try {
    const response = await genAiClient.models.generateContent({
      model: "gemini-2.5-flash-lite",
      config: {
        systemInstruction:
          "You extract names from conversations. Only return the name the user introduces as their own identity — ignore any names mentioned in the assistant's messages. Return JSON only — no markdown, no explanation.",
      },
      contents: buildContents(messages),
    });
    const text = response.text ?? "";
    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) return undefined;
    const parsed = JSON.parse(jsonMatch[0]) as { name?: string };
    if (!parsed.name) return undefined;
    // Strip anything that isn't a letter, space, hyphen, or apostrophe
    const sanitized = parsed.name.replace(/[^a-zA-Z\s'\-]/g, "").trim();
    return sanitized || undefined;
  } catch (err) {
    console.error("extractName failed:", err);
    return undefined;
  }
}
