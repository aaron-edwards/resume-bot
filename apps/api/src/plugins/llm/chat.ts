import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { GoogleGenAI } from "@google/genai";
import type { ChatMessage } from "@repo/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const resume = readFileSync(join(__dirname, "../../data/resume.md"), "utf-8");

const CHAT_SYSTEM_PROMPT = `You are an assistant helping recruiters and hiring managers learn about a candidate through their resume and experience. Answer questions helpfully and honestly based only on the information provided. If you don't know something, say so.

Here is the candidate's resume:

${resume}`;

const MAX_HISTORY_MESSAGES = 50;

function buildSystemPrompt(userName?: string) {
  return userName
    ? `${CHAT_SYSTEM_PROMPT}\n\nThe recruiter's name is ${userName}. Address them by name occasionally when it feels natural.`
    : CHAT_SYSTEM_PROMPT;
}

export async function* streamChat(
  genAiClient: GoogleGenAI,
  messages: ChatMessage[],
  userName?: string
): AsyncGenerator<string> {
  const stream = await genAiClient.models.generateContentStream({
    model: "gemini-2.5-flash",
    config: { systemInstruction: buildSystemPrompt(userName) },
    contents: messages.slice(-MAX_HISTORY_MESSAGES).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
  });

  for await (const chunk of stream) {
    if (chunk.text) yield chunk.text;
  }
}
