import { GoogleGenAI } from "@google/genai";
import { makeExtractName } from "./extractName.js";
import { makeStreamChat } from "./streamChat.js";

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const llm = {
  extractName: makeExtractName(client),
  streamChat: makeStreamChat(client),
};
