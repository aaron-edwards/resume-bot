import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI } from "@google/genai";

const __dirname = dirname(fileURLToPath(import.meta.url));
const resume = readFileSync(join(__dirname, "../data/resume.md"), "utf-8");

const SYSTEM_PROMPT = `You are an assistant helping recruiters and hiring managers learn about a candidate through their resume and experience. Answer questions helpfully and honestly based only on the information provided. If you don't know something, say so.

Here is the candidate's resume:

${resume}`;

export type ChatChunk = { text: string | undefined };

export async function* streamChat(message: string): AsyncGenerator<ChatChunk> {
  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const stream = await client.models.generateContentStream({
    model: "gemini-2.5-flash",
    config: { systemInstruction: SYSTEM_PROMPT },
    contents: [{ role: "user", parts: [{ text: message }] }],
  });

  for await (const chunk of stream) {
    yield { text: chunk.text };
  }
}
