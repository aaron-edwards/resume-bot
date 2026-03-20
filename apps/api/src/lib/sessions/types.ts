import type { ChatMessage } from "@repo/types";

export interface SessionStore {
  getSession(sessionId: string): Promise<{ messages: ChatMessage[]; userName?: string }>;
  saveSession(
    sessionId: string,
    ipAddress: string,
    messages: ChatMessage[],
    userName?: string
  ): Promise<void>;
}
