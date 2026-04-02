import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { GoogleGenAI } from "@google/genai";
import type { ChatMessage } from "@repo/types";
import { CHAT_MODEL } from "./models";

const __dirname = dirname(fileURLToPath(import.meta.url));
// In the tsdown bundle __dirname = dist/; in tests __dirname = src/lib/llm/
const dataDir = existsSync(join(__dirname, "data", "resume.md"))
  ? join(__dirname, "data")
  : join(__dirname, "../../data");
const resume = readFileSync(join(dataDir, "resume.md"), "utf-8");
const personal = readFileSync(join(dataDir, "personal.md"), "utf-8");

const CHAT_SYSTEM_PROMPT = `You are an assistant helping recruiters and hiring managers learn about a candidate through their resume and experience. Answer questions helpfully and honestly based only on the information provided. If you don't know something, say so.

When a user shares their name or responds to a greeting without asking a question, acknowledge it briefly (one sentence) and invite them to ask something — do not volunteer information about the candidate unprompted.

When discussing experience, prioritise the most recent role at Block (2020–2026) as it best reflects current skills and capabilities. Use earlier experience at Thoughtworks (2013–2020) to add depth, demonstrate breadth, or answer questions where it's directly relevant — but don't lead with it.

Here is the candidate's resume:

${resume}

The following is personal/fun information about the candidate. Only reference this if someone explicitly asks about hobbies, interests, personal life, or fun facts — do not volunteer it unprompted.

${personal}`;

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
    model: CHAT_MODEL,
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
