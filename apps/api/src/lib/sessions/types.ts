import type { ChatMessage } from "@repo/types";

export interface SessionStore {
  getSession(sessionId: string): Promise<ChatMessage[]>;
  saveSession(sessionId: string, ipAddress: string, messages: ChatMessage[]): Promise<void>;
}
