import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI } from "@google/genai";
import type { ChatMessage } from "@repo/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const resume = readFileSync(join(__dirname, "../data/resume.md"), "utf-8");

const CHAT_SYSTEM_PROMPT = `You are an assistant helping recruiters and hiring managers learn about a candidate through their resume and experience. Answer questions helpfully and honestly based only on the information provided. If you don't know something, say so.

Here is the candidate's resume:

${resume}`;

const MAX_HISTORY_MESSAGES = 50;

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function extractName(
  messages: ChatMessage[]
): Promise<{ found: boolean; name?: string }> {
  try {
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash-lite",
      config: {
        systemInstruction:
          "You extract names from conversations. Only return the name the user introduces as their own identity — ignore any names mentioned in the assistant's messages. Return JSON only — no markdown, no explanation.",
      },
      contents: [
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
      ],
    });
    const text = response.text ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { found: false };
    return JSON.parse(jsonMatch[0]) as { found: boolean; name?: string };
  } catch {
    return { found: false };
  }
}

export async function* streamChat(
  messages: ChatMessage[],
  userName?: string
): AsyncGenerator<string> {
  const systemPrompt = userName
    ? `${CHAT_SYSTEM_PROMPT}\n\nThe recruiter's name is ${userName}. Address them by name occasionally when it feels natural.`
    : CHAT_SYSTEM_PROMPT;

  const stream = await client.models.generateContentStream({
    model: "gemini-2.5-flash",
    config: { systemInstruction: systemPrompt },
    contents: messages.slice(-MAX_HISTORY_MESSAGES).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
  });

  for await (const chunk of stream) {
    if (chunk.text) yield chunk.text;
  }
}
