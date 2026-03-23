import { GoogleGenAI } from "@google/genai";
import type { ChatMessage } from "@repo/types";
import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { streamChat } from "./chat.js";
import { extractName } from "./extractName.js";

declare module "fastify" {
  interface FastifyInstance {
    llm: {
      extractName: (messages: ChatMessage[]) => Promise<string | undefined>;
      streamChat: (messages: ChatMessage[], userName?: string) => AsyncGenerator<string>;
    };
  }
}

const llmPlugin: FastifyPluginAsync = async (fastify) => {
  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  fastify.decorate("llm", {
    extractName: (messages) => extractName(client, messages),
    streamChat: (messages, userName) => streamChat(client, messages, userName),
  });
};

export default fp(llmPlugin, { name: "llm" });
