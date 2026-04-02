import "dotenv/config";
import { GoogleGenAI, type GoogleGenAI as GoogleGenAIType } from "@google/genai";
import type { Firestore } from "firebase-admin/firestore";
import { buildApp } from "./app";
import { streamChat } from "./lib/llm/chat";
import { extractName } from "./lib/llm/extractName";
import { firestoreSessionStore, getDb } from "./lib/sessions/firestore";
import { memorySessionStore } from "./lib/sessions/memory";

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const firestore = process.env.SESSION_STORE === "firestore" ? getDb() : undefined;
const sessionStore =
  process.env.SESSION_STORE === "firestore" ? firestoreSessionStore : memorySessionStore;

const app = buildApp({
  llm: {
    extractName: (messages) => extractName(genai, messages),
    streamChat: (messages, userName) => streamChat(genai, messages, userName),
  },
  genai: genai as GoogleGenAIType,
  firestore,
  sessionStore,
  corsOrigin: process.env.CORS_ORIGIN,
  logger: process.env.NODE_ENV !== "test",
  routePrefix: "/api",
});

app.log.info(
  {
    sessionStore: process.env.SESSION_STORE === "firestore" ? "firestore" : "in memory",
  },
  "Resume Bot built"
);

try {
  await app.listen({ port: 3001, host: "0.0.0.0" });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
