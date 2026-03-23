import type { ChatMessage } from "@repo/types";
import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

export interface LlmInterface {
  extractName(messages: ChatMessage[]): Promise<string | undefined>;
  streamChat(messages: ChatMessage[], userName?: string): AsyncGenerator<string>;
}

declare module "fastify" {
  interface FastifyInstance {
    llm: LlmInterface;
  }
}

const llmPlugin: FastifyPluginAsync<{ llm: LlmInterface }> = async (fastify, opts) => {
  fastify.decorate("llm", opts.llm);
};

export default fp<{ llm: LlmInterface }>(llmPlugin, { name: "llm" });
