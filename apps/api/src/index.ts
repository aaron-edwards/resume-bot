import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import { buildApp } from "./app.js";
import { streamChat } from "./plugins/llm/chat.js";
import { extractName } from "./plugins/llm/extractName.js";
import { firestoreSessionStore } from "./plugins/sessions/firestore.js";
import { memorySessionStore } from "./plugins/sessions/memory.js";

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
