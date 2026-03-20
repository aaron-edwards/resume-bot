import type { ChatMessage } from "@repo/types";
import type { SessionStore } from "./types.js";

type Session = {
  ipAddress: string;
  createdAt: Date;
  updatedAt: Date;
  messages: ChatMessage[];
  userName?: string;
};

const store = new Map<string, Session>();

export const memorySessionStore: SessionStore = {
  async getSession(sessionId) {
    const session = store.get(sessionId);
    return { messages: session?.messages ?? [], userName: session?.userName };
  },

  async saveSession(sessionId, ipAddress, messages, userName?) {
    const existing = store.get(sessionId);
    if (existing) {
      store.set(sessionId, { ...existing, ipAddress, updatedAt: new Date(), messages, userName: userName ?? existing.userName });
    } else {
      store.set(sessionId, { ipAddress, createdAt: new Date(), updatedAt: new Date(), messages, userName });
    }
  },
};
