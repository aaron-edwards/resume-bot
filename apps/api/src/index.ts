import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import { buildApp } from "./app.js";
import { streamChat } from "./lib/llm/chat.js";
import { extractName } from "./lib/llm/extractName.js";
import { firestoreSessionStore } from "./lib/sessions/firestore.js";
import { memorySessionStore } from "./lib/sessions/memory.js";

if (!process.env.GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY environment variable is required");
  process.exit(1);
}

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const sessionStore =
  process.env.SESSION_STORE === "firestore" ? firestoreSessionStore : memorySessionStore;

const app = buildApp({
  llm: {
    extractName: (messages) => extractName(genai, messages),
    streamChat: (messages, userName) => streamChat(genai, messages, userName),
  },
  sessionStore,
  corsOrigin: process.env.CORS_ORIGIN,
  logger: process.env.NODE_ENV !== "test",
});

try {
  await app.listen({ port: 3001, host: "0.0.0.0" });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
