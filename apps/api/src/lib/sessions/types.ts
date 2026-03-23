import type { ChatMessage } from "@repo/types";

export interface SessionStore {
  getSession(
    sessionId: string
  ): Promise<{ messages: ChatMessage[]; userName?: string; ip?: string }>;
  saveSession(
    sessionId: string,
    messages: ChatMessage[],
    userName?: string,
    ip?: string
  ): Promise<void>;
}
