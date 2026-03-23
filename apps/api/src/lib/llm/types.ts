import type { ChatMessage } from "@repo/types";

export interface LLMClient {
  extractName(messages: ChatMessage[]): Promise<string | undefined>;
  streamChat(messages: ChatMessage[], userName?: string): AsyncGenerator<string>;
}
